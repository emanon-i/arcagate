// File search cancellation state (PH-420 / Nielsen H3 ユーザ制御)
//
// 各 search call は (search_id, AtomicBool) ペアを HashMap に登録。
// walk 中に AtomicBool::load(Relaxed) で cancel をチェック。
// `cmd_cancel_file_search(search_id)` で AtomicBool::store(true) → walk 中断。

use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

#[derive(Default)]
pub struct FileSearchState(pub Mutex<HashMap<String, Arc<AtomicBool>>>);

impl FileSearchState {
    pub fn register(&self, search_id: &str) -> Arc<AtomicBool> {
        let token = Arc::new(AtomicBool::new(false));
        let mut guard = self.0.lock().expect("file search state mutex poisoned");
        // 同じ search_id を再登録するなら古いものを cancel して置換
        if let Some(old) = guard.insert(search_id.to_string(), token.clone()) {
            old.store(true, std::sync::atomic::Ordering::Relaxed);
        }
        token
    }

    pub fn cancel(&self, search_id: &str) -> bool {
        let mut guard = self.0.lock().expect("file search state mutex poisoned");
        if let Some(token) = guard.remove(search_id) {
            token.store(true, std::sync::atomic::Ordering::Relaxed);
            true
        } else {
            false
        }
    }

    pub fn complete(&self, search_id: &str) {
        let mut guard = self.0.lock().expect("file search state mutex poisoned");
        guard.remove(search_id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::Ordering;

    #[test]
    fn register_creates_token() {
        let state = FileSearchState::default();
        let token = state.register("a");
        assert!(!token.load(Ordering::Relaxed));
    }

    #[test]
    fn cancel_sets_token_true_and_removes() {
        let state = FileSearchState::default();
        let token = state.register("a");
        assert!(state.cancel("a"));
        assert!(token.load(Ordering::Relaxed));
        // 2 度目の cancel は false
        assert!(!state.cancel("a"));
    }

    #[test]
    fn re_register_cancels_previous() {
        let state = FileSearchState::default();
        let old = state.register("a");
        let new = state.register("a");
        assert!(old.load(Ordering::Relaxed)); // 古い token は cancel された
        assert!(!new.load(Ordering::Relaxed)); // 新 token は alive
    }

    #[test]
    fn complete_removes_without_cancel() {
        let state = FileSearchState::default();
        let token = state.register("a");
        state.complete("a");
        assert!(!token.load(Ordering::Relaxed)); // cancel フラグは false のまま
        assert!(!state.cancel("a")); // 既に削除済み
    }
}
