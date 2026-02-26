/// System audio capture for macOS using ScreenCaptureKit
///
/// Captures audio from all system apps (Zoom, Meet, Teams, Spotify, etc.)
/// using Apple's ScreenCaptureKit framework (macOS 12.3+).
///
/// The captured audio (the other person's voice in a call) is mixed
/// with the microphone audio to produce a complete transcription
/// of both sides of the conversation.

#[cfg(target_os = "macos")]
pub mod macos {
    use std::sync::Arc;
    use parking_lot::Mutex;
    use crate::audio::RecordingState;

    use screencapturekit::prelude::*;

    /// Handler that receives system audio buffers from ScreenCaptureKit
    struct SystemAudioHandler {
        state: Arc<Mutex<RecordingState>>,
    }

    // Safety: SystemAudioHandler is only used within the SCStream callback context
    unsafe impl Send for SystemAudioHandler {}
    unsafe impl Sync for SystemAudioHandler {}

    impl SCStreamOutputTrait for SystemAudioHandler {
        fn did_output_sample_buffer(&self, sample: CMSampleBuffer, output_type: SCStreamOutputType) {
            // We only care about audio, not video frames
            if !matches!(output_type, SCStreamOutputType::Audio) {
                return;
            }

            // Extract audio data from the sample buffer
            if let Some(audio_buffer_list) = sample.audio_buffer_list() {
                let mut state = self.state.lock();
                if !state.is_recording {
                    return;
                }

                // Process each audio buffer (usually 1 for mono)
                for buffer in &audio_buffer_list {
                    let raw_bytes = buffer.data();
                    if raw_bytes.is_empty() {
                        continue;
                    }

                    // Audio data is f32 PCM (configured via with_sample_rate)
                    // Convert raw bytes to f32 samples
                    let f32_samples: Vec<f32> = raw_bytes
                        .chunks_exact(4)
                        .map(|chunk| {
                            let bytes: [u8; 4] = [chunk[0], chunk[1], chunk[2], chunk[3]];
                            f32::from_le_bytes(bytes)
                        })
                        .collect();

                    state.system_samples.extend(f32_samples);
                }
            }
        }
    }

    /// Wrapper to make SCStream usable across threads
    pub struct SendSCStream(SCStream);
    unsafe impl Send for SendSCStream {}
    unsafe impl Sync for SendSCStream {}

    impl SendSCStream {
        pub fn stop(&mut self) -> Result<(), String> {
            self.0.stop_capture().map_err(|e| format!("Stop error: {:?}", e))
        }
    }

    /// Start capturing system audio via ScreenCaptureKit.
    ///
    /// This captures all audio output from macOS — the voices of other
    /// participants in Zoom/Meet/Teams calls, music, system sounds, etc.
    ///
    /// Requires "Screen Recording" permission in System Preferences.
    /// macOS will show a permission dialog automatically on first use.
    pub fn start_system_audio_capture(
        state: Arc<Mutex<RecordingState>>,
    ) -> Result<SendSCStream, String> {
        // 1. Get available displays
        let content = SCShareableContent::get()
            .map_err(|e| format!("Nie można uzyskać zawartości ekranu: {:?}", e))?;

        let display = content
            .displays()
            .into_iter()
            .next()
            .ok_or("Nie znaleziono wyświetlacza")?;

        // 2. Create content filter — capture entire display (we only need audio)
        let filter = SCContentFilter::create()
            .with_display(&display)
            .with_excluding_windows(&[])
            .build();

        // 3. Configure for audio-only capture at 16kHz mono (matches our mic)
        let config = SCStreamConfiguration::new()
            .with_width(2)    // Minimal video (required but we ignore it)
            .with_height(2)
            .with_captures_audio(true)
            .with_sample_rate(16000)   // Match microphone sample rate
            .with_channel_count(1);     // Mono

        // 4. Create handler
        let handler = SystemAudioHandler {
            state: state.clone(),
        };

        // 5. Start capture
        let mut stream = SCStream::new(&filter, &config);
        stream.add_output_handler(handler, SCStreamOutputType::Audio);
        stream.start_capture()
            .map_err(|e| format!("Błąd uruchomienia przechwytywania audio systemu: {:?}", e))?;

        eprintln!("[Lilapu] System audio capture started via ScreenCaptureKit");

        Ok(SendSCStream(stream))
    }
}

/// Placeholder for non-macOS platforms
#[cfg(not(target_os = "macos"))]
pub mod fallback {
    use std::sync::Arc;
    use parking_lot::Mutex;
    use crate::audio::RecordingState;

    pub fn start_system_audio_capture(_state: Arc<Mutex<RecordingState>>) -> Result<(), String> {
        eprintln!("[Lilapu] System audio capture is not supported on this platform");
        Ok(())
    }
}
