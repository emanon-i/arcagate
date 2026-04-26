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
});
