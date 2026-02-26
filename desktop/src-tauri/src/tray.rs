use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Emitter, Manager,
};

/// Create the system tray icon with menu
pub fn create_tray(app: &AppHandle) -> Result<TrayIcon, tauri::Error> {
    let record = MenuItem::with_id(app, "record", "🎙️ Nagrywaj rozmowę", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Pokaż Lilapu", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Zamknij", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&record, &show, &quit])?;

    let tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Lilapu — Prywatny Asystent Wiedzy")
        .on_menu_event(move |app, event| {
            match event.id.as_ref() {
                "record" => {
                    // Emit event to frontend to toggle recording
                    let _ = app.emit("tray-toggle-recording", ());
                    // Show the window so user can see recording status
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(tray)
}
