use serde::Serialize;
use tauri::Manager;

#[derive(Serialize)]
struct DesktopEnvironment {
    platform: String,
    app_data_dir: String,
    default_workspace_dir: String,
}

#[tauri::command]
fn desktop_environment(app: tauri::AppHandle) -> Result<DesktopEnvironment, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to resolve app data directory: {error}"))?;
    let workspace_dir = app_data_dir.join("workspace");

    std::fs::create_dir_all(&workspace_dir)
        .map_err(|error| format!("Unable to create workspace directory: {error}"))?;

    Ok(DesktopEnvironment {
        platform: std::env::consts::OS.to_string(),
        app_data_dir: app_data_dir.to_string_lossy().to_string(),
        default_workspace_dir: workspace_dir.to_string_lossy().to_string(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![desktop_environment])
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| Box::<dyn std::error::Error>::from(error))?;
            std::fs::create_dir_all(app_data_dir)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MindDock desktop app");
}
