import { describe, expect, it } from 'vitest';
import { parseWidgetConfig } from './widget-config';

const defaults = { maxItems: 10, pollInterval: 30 };

describe('parseWidgetConfig', () => {
	it('returns defaults for null', () => {
		expect(parseWidgetConfig(null, defaults)).toEqual(defaults);
	});

	it('returns defaults for undefined', () => {
		expect(parseWidgetConfig(undefined, defaults)).toEqual(defaults);
	});

	it('returns defaults for empty string', () => {
		expect(parseWidgetConfig('', defaults)).toEqual(defaults);
	});

	it('merges valid JSON with defaults', () => {
		const raw = JSON.stringify({ maxItems: 5, pollInterval: 60 });
		expect(parseWidgetConfig(raw, defaults)).toEqual({ maxItems: 5, pollInterval: 60 });
	});

	it('merges partial JSON with defaults', () => {
		const raw = JSON.stringify({ maxItems: 20 });
		expect(parseWidgetConfig(raw, defaults)).toEqual({ maxItems: 20, pollInterval: 30 });
	});

	it('returns defaults for invalid JSON', () => {
		expect(parseWidgetConfig('{broken', defaults)).toEqual(defaults);
	});
});
