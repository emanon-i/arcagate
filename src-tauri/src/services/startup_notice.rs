//! PH-PQ-100 T4: 起動経路で発生した self-recovery を frontend へ伝える窓口。
//!
//! setup 中 (= window 未 load) に config 破損などを検知しても、 その時点で event を
//! emit しても listener が居らず失われる。 そこで notice code を managed state に
//! 積んでおき、 frontend が mount 後に `cmd_take_startup_notices` で 1 度だけ取得する。
//!
//! DB 破損 (T3) は深刻なので native dialog で別途即時通知する。 本 state は
//! config 破損 (T4) など 「toast で十分」 な軽度の縮退通知に使う。

use std::sync::Mutex;

/// 起動時の self-recovery 通知。 notice code は frontend の i18n キーに対応する
/// 安定識別子 (例: `"config.hotkey_recovered"`)。
#[derive(Default)]
pub struct StartupNotices(Mutex<Vec<String>>);

impl StartupNotices {
    /// notice code を 1 件積む。 mutex poison 時も panic させず復旧する。
    pub fn push(&self, code: &str) {
        let mut guard = self.0.lock().unwrap_or_else(|e| {
            log::warn!("startup notices mutex poisoned, recovering");
            e.into_inner()
        });
        guard.push(code.to_string());
    }

    /// 積まれた notice code を全て取り出してクリアする (frontend が 1 度だけ呼ぶ)。
    pub fn take(&self) -> Vec<String> {
        let mut guard = self.0.lock().unwrap_or_else(|e| {
            log::warn!("startup notices mutex poisoned, recovering");
            e.into_inner()
        });
        std::mem::take(&mut *guard)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn push_then_take_returns_all_and_clears() {
        let notices = StartupNotices::default();
        notices.push("config.hotkey_recovered");
        notices.push("config.other");
        let taken = notices.take();
        assert_eq!(taken, vec!["config.hotkey_recovered", "config.other"]);
        // 2 度目の take は空
        assert!(notices.take().is_empty());
    }

    #[test]
    fn take_empty_returns_empty() {
        let notices = StartupNotices::default();
        assert!(notices.take().is_empty());
    }
}
