import { describe, expect, it } from 'vitest';
import { formatIpcError } from './ipc-error';

describe('formatIpcError', () => {
	it('formats db.lock with retry hint', () => {
		const msg = formatIpcError(
			{ operation: 'アイテム作成' },
			{ code: 'db.lock', message: 'lock held' },
		);
		expect(msg).toContain('アイテム作成に失敗しました');
		expect(msg).toContain('DB アクセスが競合');
	});

	it('formats not_found with reload hint', () => {
		const msg = formatIpcError(
			{ operation: 'テーマ保存' },
			{ code: 'not_found', message: 'theme x' },
		);
		expect(msg).toContain('テーマ保存に失敗しました');
		expect(msg).toContain('対象が見つかりません');
	});

	it('formats invalid_input with original message', () => {
		const msg = formatIpcError(
			{ operation: '設定保存' },
			{ code: 'invalid_input', message: 'name must not be empty' },
		);
		expect(msg).toContain('設定保存に失敗しました');
		expect(msg).toContain('name must not be empty');
	});

	it('formats permission code with access right hint', () => {
		const msg = formatIpcError(
			{ operation: 'ファイル削除' },
			{ code: 'permission', message: 'denied' },
		);
		expect(msg).toContain('ファイル削除に失敗しました');
		expect(msg).toContain('権限がありません');
	});

	it('formats cancelled as info', () => {
		const msg = formatIpcError(
			{ operation: 'インポート' },
			{ code: 'cancelled', message: 'Cancelled' },
		);
		expect(msg).toContain('インポートを中止しました');
	});

	it('formats watch.failed', () => {
		const msg = formatIpcError(
			{ operation: 'フォルダ追加' },
			{ code: 'watch.failed', message: 'C:/x: io error' },
		);
		expect(msg).toContain('フォルダ追加に失敗しました');
		expect(msg).toContain('フォルダ監視を開始できませんでした');
	});

	it('falls back to generic format for unknown code', () => {
		const msg = formatIpcError({ operation: 'X' }, { code: 'mystery.code', message: 'something' });
		expect(msg).toContain('Xに失敗しました');
		expect(msg).toContain('something');
	});

	it('falls back to String() for non-AppError errors', () => {
		const msg = formatIpcError({ operation: 'Y' }, 'plain string error');
		expect(msg).toContain('Yに失敗しました');
		expect(msg).toContain('plain string error');
	});
});
