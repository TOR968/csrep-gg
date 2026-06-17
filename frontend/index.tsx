import { definePlugin } from '@steambrew/client';
import { buildInjectionCode } from './inject';
import { CSREP_LOGO_DATA_URL } from './logo-data-url';

const PROFILE_URL_PATTERN = /steamcommunity\.com\/(id|profiles)\//;
const INJECTION_CODE = buildInjectionCode(CSREP_LOGO_DATA_URL);

async function setupCommunityInjection() {
	const CDP = (window as any).MILLENNIUM_API?.ChromeDevToolsProtocol;
	if (!CDP) { console.error('[CSrep] No CDP available'); return; }

	await CDP.send('Target.setDiscoverTargets', { discover: true });

	const pending = new Map<string, ReturnType<typeof setTimeout>>();

	const injectIntoTarget = async (targetId: string) => {
		const res = await CDP.send('Target.attachToTarget', { targetId, flatten: true });
		const sessionId = res?.sessionId;
		if (!sessionId) return;
		await CDP.send('Runtime.evaluate', { expression: INJECTION_CODE, awaitPromise: true }, sessionId);
	};

	const processTarget = (targetInfo: any) => {
		const url: string = targetInfo?.url ?? '';
		if (!PROFILE_URL_PATTERN.test(url)) return;
		const targetId: string = targetInfo.targetId;
		clearTimeout(pending.get(targetId));
		pending.set(targetId, setTimeout(() => {
			pending.delete(targetId);
			injectIntoTarget(targetId).catch(e => console.error('[CSrep] injection error:', e));
		}, 200));
	};

	CDP.on('Target.targetCreated', (e: any) => processTarget(e?.targetInfo));
	CDP.on('Target.targetInfoChanged', (e: any) => processTarget(e?.targetInfo));

	const { targetInfos } = await CDP.send('Target.getTargets', {});
	for (const t of targetInfos ?? []) processTarget(t);
}

export default definePlugin(() => {
	setupCommunityInjection().catch(e => console.error('[CSrep] setup error:', e));
	return { name: 'csrep-gg', title: 'CSrep.gg' } as any;
});
