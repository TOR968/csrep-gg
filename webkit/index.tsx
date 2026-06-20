import { callable } from '@steambrew/webkit';
import { csrepGgInjectMain } from '../frontend/inject';
import { CSREP_LOGO_DATA_URL } from '../frontend/logo-data-url';

const PROFILE_URL_PATTERN = /steamcommunity\.com\/(id|profiles)\//;

const GetSettingsRpc = callable<[], string>('GetSettings');

async function readSettings(): Promise<{ openExternal: boolean; injectionMode: string }> {
	const defaults = { openExternal: false, injectionMode: 'auto' };
	try {
		const raw = await GetSettingsRpc();
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === 'object') return { ...defaults, ...parsed };
		}
	} catch (e) {
		console.error('[CSrep] webkit settings read failed:', e);
	}
	return defaults;
}

export default async function WebkitMain() {
	if (!PROFILE_URL_PATTERN.test(location.href)) return;
	const { openExternal, injectionMode } = await readSettings();
	if (injectionMode === 'cdp') return;
	csrepGgInjectMain(openExternal, 'webkit', CSREP_LOGO_DATA_URL);
}
