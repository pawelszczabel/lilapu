/// Screenshot capture for OCR
/// Uses xcap to capture the entire primary monitor or a specific region.

use xcap::Monitor;
use base64::Engine;

/// Encode an RgbaImage to PNG bytes
fn rgba_to_png_base64(image: &image::RgbaImage) -> Result<String, String> {
    let mut png_bytes = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
    image::ImageEncoder::write_image(
        encoder,
        image.as_raw(),
        image.width(),
        image.height(),
        image::ExtendedColorType::Rgba8,
    )
    .map_err(|e| format!("Błąd kodowania PNG: {}", e))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(&png_bytes))
}

/// Capture the entire primary screen and return as base64 PNG
#[tauri::command]
pub fn capture_screenshot() -> Result<String, String> {
    let monitors = Monitor::all().map_err(|e| format!("Nie można pobrać monitorów: {}", e))?;
    
    let monitor = monitors
        .into_iter()
        .find(|m| m.is_primary().unwrap_or(false))
        .or_else(|| Monitor::all().ok()?.into_iter().next())
        .ok_or("Nie znaleziono monitora")?;

    let image = monitor
        .capture_image()
        .map_err(|e| format!("Błąd przechwytywania ekranu: {}", e))?;

    rgba_to_png_base64(&image)
}

/// Capture a specific region of the screen
#[tauri::command]
pub fn capture_screen_region(x: u32, y: u32, width: u32, height: u32) -> Result<String, String> {
    let monitors = Monitor::all().map_err(|e| format!("Nie można pobrać monitorów: {}", e))?;
    
    let monitor = monitors
        .into_iter()
        .find(|m| m.is_primary().unwrap_or(false))
        .or_else(|| Monitor::all().ok()?.into_iter().next())
        .ok_or("Nie znaleziono monitora")?;

    let image = monitor
        .capture_region(x, y, width, height)
        .map_err(|e| format!("Błąd przechwytywania regionu: {}", e))?;

    rgba_to_png_base64(&image)
}

/// Read a dropped file and return its contents as base64
#[tauri::command]
pub fn read_file_as_base64(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path)
        .map_err(|e| format!("Nie można odczytać pliku {}: {}", path, e))?;
    
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}
