import { describe, expect, it } from 'vitest';
import { formatLaunchError } from './launch-error';

describe('formatLaunchError', () => {
	it('formats LaunchFileNotFound with recovery hint', () => {
		const msg = formatLaunchError('Steam', 'Error: File not found: C:\\Steam\\steam.exe');
		expect(msg).toContain('「Steam」が見つかりません');
		expect(msg).toContain('パスが移動 / 削除');
		expect(msg).toContain('アイテム編集で確認');
	});

	it('formats LaunchPermissionDenied with admin hint', () => {
		const msg = formatLaunchError('admin-tool', 'Error: Permission denied: access denied');
		expect(msg).toContain('「admin-tool」の起動権限がありません');
		expect(msg).toContain('管理者として実行');
	});

	it('formats LaunchNotExecutable with item type hint', () => {
		const msg = formatLaunchError('readme', 'Error: Not executable: target.txt');
		expect(msg).toContain('「readme」は実行可能ファイルではありません');
		expect(msg).toContain('アイテム種別');
	});

	it('falls back to generic format for unknown errors', () => {
		const msg = formatLaunchError('Game', 'Some other error');
		expect(msg).toContain('「Game」の起動に失敗しました');
		expect(msg).toContain('Some other error');
	});

	it('uses fallback label when label is empty', () => {
		const msg = formatLaunchError('', 'Error: File not found: foo');
		expect(msg).toContain('「アイテム」が見つかりません');
	});

	it('handles non-string error inputs via String() coercion', () => {
		const errObj = { toString: () => 'Error: File not found: bar' };
		const msg = formatLaunchError('X', errObj);
		expect(msg).toContain('「X」が見つかりません');
	});

	// PH-429: AppError serialize 形式 { code, message } 経由の判定
	it('uses errorCode field when error is AppError object (file_not_found)', () => {
		const err = { code: 'launch.file_not_found', message: 'Some other Rust message' };
		const msg = formatLaunchError('GameX', err);
		expect(msg).toContain('「GameX」が見つかりません');
	});

	it('uses errorCode field when error is AppError object (permission_denied)', () => {
		const err = { code: 'launch.permission_denied', message: 'access denied raw' };
		const msg = formatLaunchError('AdminApp', err);
		expect(msg).toContain('起動権限がありません');
	});

	it('uses errorCode field when error is AppError object (not_executable)', () => {
		const err = { code: 'launch.not_executable', message: 'no extension' };
		const msg = formatLaunchError('ReadmeFile', err);
		expect(msg).toContain('実行可能ファイルではありません');
	});

	it('falls back to message field for unknown AppError code', () => {
		const err = { code: 'unknown.error', message: 'unknown thing' };
		const msg = formatLaunchError('X', err);
		expect(msg).toContain('「X」の起動に失敗しました');
		expect(msg).toContain('unknown thing');
	});

	// PH-443 (batch-97): 文言 invariant 検証 (regression 防止)
	it('文言 invariant: 全 4 パターンに「<label>」記号が含まれる', () => {
		const errors = [
			{ code: 'launch.file_not_found', message: 'm' },
			{ code: 'launch.permission_denied', message: 'm' },
			{ code: 'launch.not_executable', message: 'm' },
			{ code: 'unknown', message: 'm' },
		];
		for (const err of errors) {
			const msg = formatLaunchError('TestLabel', err);
			expect(msg).toContain('「TestLabel」');
		}
	});
});
