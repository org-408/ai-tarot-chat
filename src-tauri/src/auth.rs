use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{command, AppHandle, Listener, Manager, WebviewWindow};
use tokio::time::{sleep, Duration};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub image: Option<String>,
    pub plan_type: String,
    pub is_registered: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AuthResult {
    pub success: bool,
    pub user: User,
    pub session: serde_json::Value,
}

// メイン認証機能：内部ブラウザでNext.js認証
#[command]
pub async fn tauri_auth_login(app: AppHandle) -> Result<AuthResult, String> {
    // Next.js認証画面のURL（Tauriフラグ付き）
    let auth_url = "http://localhost:3000/auth/signin?isTauri=true";

    // 内部ブラウザで認証実行
    let auth_result = open_auth_browser_and_wait(app, auth_url).await?;

    Ok(auth_result)
}

async fn open_auth_browser_and_wait(app: AppHandle, auth_url: &str) -> Result<AuthResult, String> {
    use tauri_plugin_opener::OpenerExt;

    // 内部ブラウザで認証URLを開く
    app.opener()
        .open_url(auth_url, Some("inAppBrowser"))
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    // メインウィンドウを取得 (Tauri 2.8対応)
    let main_window = app
        .get_webview_window("main")
        .or_else(|| {
            // "main"ラベルがない場合、最初のウィンドウを取得
            let windows = app.webview_windows();
            windows.values().next().cloned()
        })
        .ok_or("No window found")?;

    // 認証結果を監視して待機
    monitor_auth_result(&main_window).await
}

async fn monitor_auth_result(window: &WebviewWindow) -> Result<AuthResult, String> {
    // 認証結果を保存するためのArc<Mutex>
    let auth_result: Arc<Mutex<Option<AuthResult>>> = Arc::new(Mutex::new(None));
    let auth_result_clone = auth_result.clone();

    // イベントリスナーを設定
    let _listener = window.listen("auth-result", move |event| {
        // payload() は &str を返すので、JSONパースが必要
        if let Ok(result) = serde_json::from_str::<AuthResult>(event.payload()) {
            if let Ok(mut auth_guard) = auth_result_clone.lock() {
                *auth_guard = Some(result);
            }
        }
    });

    // 3分間、100ms間隔でlocalStorageをチェック
    for _i in 0..1800 {
        // JavaScriptでlocalStorageから認証結果を取得し、イベントとして送信
        let script = r#"
            (function() {
                try {
                    const result = localStorage.getItem('tauri-auth-result');
                    if (result) {
                        localStorage.removeItem('tauri-auth-result');
                        const authData = JSON.parse(result);
                        // Tauriイベントとして送信
                        if (window.__TAURI__ && window.__TAURI__.event) {
                            window.__TAURI__.event.emit('auth-result', authData);
                        }
                        return true;
                    }
                    return false;
                } catch (e) {
                    console.error('Auth check error:', e);
                    return false;
                }
            })()
        "#;

        // evalで実行（戻り値は期待しない）
        let _ = window.eval(script);

        // 結果が設定されたかチェック
        if let Ok(guard) = auth_result.lock() {
            if let Some(result) = guard.clone() {
                return Ok(result);
            }
        }

        sleep(Duration::from_millis(100)).await;
    }

    Err("Authentication timeout".to_string())
}

// 保存されたユーザー情報取得
#[command]
pub async fn get_stored_user() -> Result<Option<User>, String> {
    // 実際の実装ではTauriのストレージAPIを使用
    // ここでは簡略化
    Ok(None)
}

// 認証データクリア
#[command]
pub async fn clear_auth_data() -> Result<(), String> {
    // ローカルストレージの認証データをクリア
    Ok(())
}
