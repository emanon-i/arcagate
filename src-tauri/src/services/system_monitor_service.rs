use std::sync::Mutex;

use serde::Serialize;
use sysinfo::{Disks, Networks, System};

use crate::utils::error::AppError;

#[derive(Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SystemStats {
    pub cpu_percent: f32,
    pub mem_used_bytes: u64,
    pub mem_total_bytes: u64,
}

/// PH-issue-042 / 検収項目 #27: ネットワーク累積バイト (受信 / 送信、interface ごと)。
/// frontend は前回値との差分を delta として表示する。
#[derive(Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NetworkStats {
    pub interface: String,
    pub rx_total_bytes: u64,
    pub tx_total_bytes: u64,
}

#[derive(Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DiskStats {
    pub mount: String,
    pub used_bytes: u64,
    pub total_bytes: u64,
}

/// `System` を再利用するためグローバル Mutex に保持。
/// `refresh_*` を 2 回呼ぶことで CPU 使用率の差分を取得する（sysinfo の仕様）。
static SYSTEM: Mutex<Option<System>> = Mutex::new(None);

pub fn get_system_stats() -> Result<SystemStats, AppError> {
    let mut guard = SYSTEM.lock().map_err(|_| AppError::DbLock)?;
    let sys = guard.get_or_insert_with(System::new);
    sys.refresh_cpu_usage();
    sys.refresh_memory();
    let cpu_percent = if sys.cpus().is_empty() {
        0.0
    } else {
        let sum: f32 = sys.cpus().iter().map(|c| c.cpu_usage()).sum();
        sum / sys.cpus().len() as f32
    };
    Ok(SystemStats {
        cpu_percent: cpu_percent.clamp(0.0, 100.0),
        mem_used_bytes: sys.used_memory(),
        mem_total_bytes: sys.total_memory(),
    })
}

pub fn get_disk_stats() -> Result<Vec<DiskStats>, AppError> {
    let disks = Disks::new_with_refreshed_list();
    let mut out = Vec::new();
    for d in disks.list() {
        let total = d.total_space();
        let avail = d.available_space();
        let used = total.saturating_sub(avail);
        let mount = d.mount_point().to_string_lossy().into_owned();
        out.push(DiskStats {
            mount,
            used_bytes: used,
            total_bytes: total,
        });
    }
    Ok(out)
}

/// PH-issue-042 / 検収項目 #27: ネットワーク stats (累積受信 / 送信バイト、interface 別)。
/// frontend で前回値との差分から throughput を計算する。
pub fn get_network_stats() -> Result<Vec<NetworkStats>, AppError> {
    let networks = Networks::new_with_refreshed_list();
    let mut out: Vec<NetworkStats> = Vec::new();
    for (name, data) in networks.iter() {
        out.push(NetworkStats {
            interface: name.clone(),
            rx_total_bytes: data.total_received(),
            tx_total_bytes: data.total_transmitted(),
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cpu_in_range() {
        let s = get_system_stats().unwrap();
        assert!((0.0..=100.0).contains(&s.cpu_percent));
    }

    #[test]
    fn mem_used_le_total() {
        let s = get_system_stats().unwrap();
        assert!(s.mem_total_bytes > 0);
        assert!(s.mem_used_bytes <= s.mem_total_bytes);
    }

    #[test]
    fn disks_used_le_total() {
        let v = get_disk_stats().unwrap();
        // Windows の CI runner は常に最低 1 ディスク存在する想定だが、空でも fail はさせない
        for d in &v {
            assert!(d.used_bytes <= d.total_bytes);
            assert!(!d.mount.is_empty());
        }
    }

    #[test]
    fn second_call_does_not_panic() {
        let _ = get_system_stats().unwrap();
        let _ = get_system_stats().unwrap();
    }
}
