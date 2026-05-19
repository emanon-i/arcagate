// 長時間 scan (file search / exe scan) の cancel registry。
//
// 各 scan call は (search_id, AtomicBool) ペアを HashMap に登録。
// walk 中に AtomicBool::load(Relaxed) で cancel をチェックする。
// `cmd_cancel_*` で AtomicBool::store(true) → walk 中断。
// 同じ search_id を再登録すると古い token を cancel して置換するため、
// re-scan は明示 cancel なしで前回 scan を自動中断できる。

use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

/// search_id → cancel token の汎用 registry (PH-420 / Nielsen H3 ユーザ制御)。
#[derive(Default)]
pub struct CancelRegistry(Mutex<HashMap<String, Arc<AtomicBool>>>);

impl CancelRegistry {
    pub fn register(&self, search_id: &str) -> Arc<AtomicBool> {
        let token = Arc::new(AtomicBool::new(false));
        let mut guard = self.0.lock().expect("cancel registry mutex poisoned");
        // 同じ search_id を再登録するなら古いものを cancel して置換
        if let Some(old) = guard.insert(search_id.to_string(), token.clone()) {
            old.store(true, std::sync::atomic::Ordering::Relaxed);
        }
        token
    }

    pub fn cancel(&self, search_id: &str) -> bool {
        let mut guard = self.0.lock().expect("cancel registry mutex poisoned");
        if let Some(token) = guard.remove(search_id) {
            token.store(true, std::sync::atomic::Ordering::Relaxed);
            true
        } else {
            false
        }
    }

    pub fn complete(&self, search_id: &str) {
        let mut guard = self.0.lock().expect("cancel registry mutex poisoned");
        guard.remove(search_id);
    }
}

/// File search 用 cancel registry (PH-420)。
#[derive(Default)]
pub struct FileSearchState(pub CancelRegistry);

/// Exe scan 用 cancel registry (W-3 2026-05-19)。
/// File Search と同じ cancel 機構を Exe Folder Watch の scan に適用する。
#[derive(Default)]
pub struct ExeScanState(pub CancelRegistry);

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::Ordering;

    #[test]
    fn register_creates_token() {
        let reg = CancelRegistry::default();
        let token = reg.register("a");
        assert!(!token.load(Ordering::Relaxed));
    }

    #[test]
    fn cancel_sets_token_true_and_removes() {
        let reg = CancelRegistry::default();
        let token = reg.register("a");
        assert!(reg.cancel("a"));
        assert!(token.load(Ordering::Relaxed));
        // 2 度目の cancel は false
        assert!(!reg.cancel("a"));
    }

    #[test]
    fn re_register_cancels_previous() {
        let reg = CancelRegistry::default();
        let old = reg.register("a");
        let new = reg.register("a");
        assert!(old.load(Ordering::Relaxed)); // 古い token は cancel された
        assert!(!new.load(Ordering::Relaxed)); // 新 token は alive
    }

    #[test]
    fn complete_removes_without_cancel() {
        let reg = CancelRegistry::default();
        let token = reg.register("a");
        reg.complete("a");
        assert!(!token.load(Ordering::Relaxed)); // cancel フラグは false のまま
        assert!(!reg.cancel("a")); // 既に削除済み
    }
}
