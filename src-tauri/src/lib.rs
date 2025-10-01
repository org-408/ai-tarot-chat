// use std::sync::Mutex;
// use tauri::{command, AppHandle, Manager, State};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_web_auth::init())
        .invoke_handler(tauri::generate_handler![])
        // .setup(|app| {
        //     // Spawn setup as a non-blocking task so the windows can be
        //     // created and ran while it executes
        //     spawn(setup(app.handle().clone()));
        //     // The hook expects an Ok result
        //     Ok(())
        // })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
