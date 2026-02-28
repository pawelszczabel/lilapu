mod audio;
mod screenshot;
mod system_audio;
mod tray;

use std::sync::Arc;
use parking_lot::Mutex;

/// Wrapper to make cpal::Stream usable across threads
struct SendStream(cpal::Stream);
unsafe impl Send for SendStream {}
unsafe impl Sync for SendStream {}

/// Global app state holding audio recording data
struct AppState {
    recording: Arc<Mutex<audio::RecordingState>>,
    mic_stream: Mutex<Option<SendStream>>,
    #[cfg(target_os = "macos")]
    system_stream: Mutex<Option<system_audio::macos::SendSCStream>>,
}

/// Start recording audio (microphone + system audio if available)
#[tauri::command]
fn start_recording(state: tauri::State<AppState>) -> Result<(), String> {
    {
        let mut rec = state.recording.lock();
        if rec.is_recording {
            return Err("Nagrywanie już trwa".into());
        }
        rec.mic_samples.clear();
        rec.system_samples.clear();
        rec.is_recording = true;
    }

    // Start microphone capture
    let mic_stream = audio::start_mic_recording(state.recording.clone())?;
    *state.mic_stream.lock() = Some(SendStream(mic_stream));

    // Start system audio capture (macOS only via ScreenCaptureKit)
    #[cfg(target_os = "macos")]
    {
        match system_audio::macos::start_system_audio_capture(state.recording.clone()) {
            Ok(stream) => {
                *state.system_stream.lock() = Some(stream);
                eprintln!("[Lilapu] Recording: microphone + system audio");
            }
            Err(e) => {
                eprintln!("[Lilapu] System audio unavailable ({}), mic-only mode", e);
            }
        }
    }

    Ok(())
}

/// Stop recording and return mixed audio as base64-encoded WAV
#[tauri::command]
fn stop_recording(state: tauri::State<AppState>) -> Result<String, String> {
    let (_, _, mixed_b64) = stop_and_get_tracks(&state)?;
    Ok(mixed_b64)
}

/// Diarized recording result with separate tracks
#[derive(serde::Serialize)]
struct DiarizedRecording {
    /// Mixed audio (mic + system) as base64 WAV
    mixed_wav_b64: String,
    /// Microphone-only audio as base64 WAV (speaker: Ty)
    mic_wav_b64: String,
    /// System-audio-only as base64 WAV (speaker: Rozmówca)
    system_wav_b64: Option<String>,
    /// Whether system audio was captured
    has_system_audio: bool,
}

/// Stop recording and return separate tracks for diarization
#[tauri::command]
fn stop_recording_diarized(state: tauri::State<AppState>) -> Result<DiarizedRecording, String> {
    let (mic_b64, system_b64, mixed_b64) = stop_and_get_tracks(&state)?;
    Ok(DiarizedRecording {
        mixed_wav_b64: mixed_b64,
        mic_wav_b64: mic_b64,
        system_wav_b64: system_b64.clone(),
        has_system_audio: system_b64.is_some(),
    })
}

/// Internal: stop streams and encode all tracks
fn stop_and_get_tracks(state: &AppState) -> Result<(String, Option<String>, String), String> {
    {
        let mut rec = state.recording.lock();
        rec.is_recording = false;
    }

    // Stop mic stream
    {
        *state.mic_stream.lock() = None;
    }

    // Stop system audio
    #[cfg(target_os = "macos")]
    {
        let mut stream_lock = state.system_stream.lock();
        if let Some(ref mut stream) = *stream_lock {
            let _ = stream.stop();
        }
        *stream_lock = None;
    }

    std::thread::sleep(std::time::Duration::from_millis(100));

    let rec = state.recording.lock();
    let sample_rate = rec.sample_rate;

    if rec.mic_samples.is_empty() && rec.system_samples.is_empty() {
        return Err("Brak nagranych danych audio".into());
    }

    // Encode mic track
    let mic_wav = audio::encode_wav(&rec.mic_samples, sample_rate)?;
    use base64::Engine;
    let mic_b64 = base64::engine::general_purpose::STANDARD.encode(&mic_wav);

    // Encode system track (if available)
    let system_b64 = if !rec.system_samples.is_empty() {
        let system_wav = audio::encode_wav(&rec.system_samples, sample_rate)?;
        Some(base64::engine::general_purpose::STANDARD.encode(&system_wav))
    } else {
        None
    };

    // Encode mixed track
    let mixed_samples = if !rec.system_samples.is_empty() {
        eprintln!(
            "[Lilapu] Mixing {} mic + {} system samples",
            rec.mic_samples.len(),
            rec.system_samples.len()
        );
        audio::mix_audio(&rec.mic_samples, &rec.system_samples)
    } else {
        rec.mic_samples.clone()
    };
    let mixed_wav = audio::encode_wav(&mixed_samples, sample_rate)?;
    let mixed_b64 = base64::engine::general_purpose::STANDARD.encode(&mixed_wav);

    Ok((mic_b64, system_b64, mixed_b64))
}

/// Check if currently recording
#[tauri::command]
fn is_recording(state: tauri::State<AppState>) -> bool {
    state.recording.lock().is_recording
}

/// Get list of audio input devices
#[tauri::command]
fn list_audio_devices() -> Vec<audio::AudioDeviceInfo> {
    audio::list_input_devices()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let clerk_publishable_key = env!("VITE_CLERK_PUBLISHABLE_KEY").to_string();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // Required for tauri-plugin-clerk to route FAPI requests via Rust
        .plugin(tauri_plugin_http::init())
        // Optional: persist auth state across restarts
        .plugin(tauri_plugin_store::Builder::new().build())
        // Clerk auth plugin – routes FAPI calls through Rust, bypassing WebView cookie issues
        .plugin(
            tauri_plugin_clerk::ClerkPluginBuilder::new()
                .publishable_key(clerk_publishable_key)
                .with_tauri_store()
                .build(),
        )
        .manage(AppState {
            recording: Arc::new(Mutex::new(audio::RecordingState::default())),
            mic_stream: Mutex::new(None),
            #[cfg(target_os = "macos")]
            system_stream: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            stop_recording_diarized,
            is_recording,
            list_audio_devices,
            screenshot::capture_screenshot,
            screenshot::capture_screen_region,
            screenshot::read_file_as_base64,
        ])
        .setup(|app| {
            let _ = tray::create_tray(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
