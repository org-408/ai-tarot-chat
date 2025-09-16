use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserPlan {
    Free,
    Standard,
    Coaching,
}

struct AppState {
    current_plan: Mutex<UserPlan>,
}

// ユーザーの現在のプランを取得
#[tauri::command]
fn get_current_plan(state: State<AppState>) -> UserPlan {
    let plan = state.current_plan.lock().unwrap();
    plan.clone()
}

// プランを変更（テスト用）
#[tauri::command]
fn set_plan(plan: UserPlan, state: State<AppState>) -> Result<(), String> {
    let mut current_plan = state.current_plan.lock().unwrap();
    *current_plan = plan;
    Ok(())
}

// プランに応じた利用可能機能を取得
#[tauri::command]
fn get_plan_features(state: State<AppState>) -> PlanFeatures {
    let plan = state.current_plan.lock().unwrap();

    match *plan {
        UserPlan::Free => PlanFeatures {
            daily_limit: Some(3),
            available_spreads: vec![1, 2, 3],
            ai_chat: false,
            ads: true,
            plan_name: "フリープラン".to_string(),
        },
        UserPlan::Standard => PlanFeatures {
            daily_limit: None,
            available_spreads: (1..=14).collect(),
            ai_chat: false,
            ads: false,
            plan_name: "スタンダードプラン".to_string(),
        },
        UserPlan::Coaching => PlanFeatures {
            daily_limit: None,
            available_spreads: (1..=22).collect(),
            ai_chat: true,
            ads: false,
            plan_name: "コーチングプラン".to_string(),
        },
    }
}

#[derive(Serialize)]
struct PlanFeatures {
    daily_limit: Option<i32>,
    available_spreads: Vec<i32>,
    ai_chat: bool,
    ads: bool,
    plan_name: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            current_plan: Mutex::new(UserPlan::Free), // 初期状態はフリープラン
        })
        .invoke_handler(tauri::generate_handler![
            get_current_plan,
            set_plan,
            get_plan_features
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
