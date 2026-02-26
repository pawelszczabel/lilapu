use std::sync::Arc;
use parking_lot::Mutex;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::Serialize;

/// Shared recording state
pub struct RecordingState {
    pub is_recording: bool,
    pub mic_samples: Vec<f32>,
    pub system_samples: Vec<f32>,
    pub sample_rate: u32,
}

impl Default for RecordingState {
    fn default() -> Self {
        Self {
            is_recording: false,
            mic_samples: Vec::new(),
            system_samples: Vec::new(),
            sample_rate: 16000,
        }
    }
}

#[derive(Serialize)]
pub struct AudioDeviceInfo {
    pub name: String,
    pub is_default: bool,
}

/// Get list of available input devices
pub fn list_input_devices() -> Vec<AudioDeviceInfo> {
    let host = cpal::default_host();
    let mut devices = Vec::new();

    let default_name = host
        .default_input_device()
        .and_then(|d| d.name().ok())
        .unwrap_or_default();

    if let Ok(input_devices) = host.input_devices() {
        for device in input_devices {
            if let Ok(name) = device.name() {
                devices.push(AudioDeviceInfo {
                    is_default: name == default_name,
                    name,
                });
            }
        }
    }

    devices
}

/// Start recording from microphone
pub fn start_mic_recording(state: Arc<Mutex<RecordingState>>) -> Result<cpal::Stream, String> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or("Nie wykryto mikrofonu")?;

    let config = cpal::StreamConfig {
        channels: 1,
        sample_rate: cpal::SampleRate(16000),
        buffer_size: cpal::BufferSize::Default,
    };

    let state_clone = state.clone();
    let err_fn = |err: cpal::StreamError| {
        eprintln!("Audio stream error: {}", err);
    };

    let stream = device
        .build_input_stream(
            &config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                let mut s = state_clone.lock();
                if s.is_recording {
                    s.mic_samples.extend_from_slice(data);
                }
            },
            err_fn,
            None,
        )
        .map_err(|e| format!("Błąd streamu audio: {}", e))?;

    stream.play().map_err(|e| format!("Nie udało się uruchomić nagrywania: {}", e))?;

    Ok(stream)
}

/// Encode samples to WAV bytes
pub fn encode_wav(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>, String> {
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut cursor = std::io::Cursor::new(Vec::new());
    {
        let mut writer = hound::WavWriter::new(&mut cursor, spec)
            .map_err(|e| format!("WAV writer error: {}", e))?;

        for &sample in samples {
            let clamped = sample.max(-1.0).min(1.0);
            let int_sample = if clamped < 0.0 {
                (clamped * 32768.0) as i16
            } else {
                (clamped * 32767.0) as i16
            };
            writer.write_sample(int_sample)
                .map_err(|e| format!("WAV write error: {}", e))?;
        }

        writer.finalize()
            .map_err(|e| format!("WAV finalize error: {}", e))?;
    }

    Ok(cursor.into_inner())
}

/// Mix microphone and system audio samples
pub fn mix_audio(mic: &[f32], system: &[f32]) -> Vec<f32> {
    let max_len = mic.len().max(system.len());
    let mut mixed = Vec::with_capacity(max_len);

    for i in 0..max_len {
        let mic_sample = if i < mic.len() { mic[i] } else { 0.0 };
        let sys_sample = if i < system.len() { system[i] } else { 0.0 };
        // Simple mix with slight attenuation to prevent clipping
        let mixed_sample = ((mic_sample + sys_sample) * 0.7).max(-1.0).min(1.0);
        mixed.push(mixed_sample);
    }

    mixed
}
