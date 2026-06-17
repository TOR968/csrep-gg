function csrepGgInjectMain(logoDataUrl: string) {
	if (document.querySelector('.csrep-gg-container')) return;
	if (!/steamcommunity\.com\/(id|profiles)\//.test(location.href)) return;

	const STEAMID64_BASE = BigInt('76561197960265728');

	async function getSteamId() {
		const win = window as any;
		const candidates = [win.g_rgProfileData?.steamid64, win.g_rgProfileData?.steamid];
		for (const v of candidates) {
			if (typeof v === 'string' && v !== '0' && v.trim()) return v.trim();
		}
		const miniId = document.querySelector('[data-miniprofile]')?.getAttribute('data-miniprofile');
		if (miniId && miniId !== '0') {
			try { return (STEAMID64_BASE + BigInt(miniId)).toString(); } catch { /* ignore */ }
		}
		try {
			const xmlUrl = location.href.replace(/[?#].*/, '').replace(/\/$/, '') + '/?xml=1';
			const res = await fetch(xmlUrl);
			const text = await res.text();
			const dom = new DOMParser().parseFromString(text, 'application/xml');
			const id = dom.querySelector('steamID64')?.textContent;
			if (id && id !== '0') return id;
		} catch { /* ignore */ }
		return null;
	}

	async function inject() {
		const col = document.querySelector('.profile_rightcol');
		if (!col || col.querySelector('.csrep-gg-container')) return;
		const steamId = await getSteamId();
		if (!steamId) { console.warn('[CSrep] No SteamID'); return; }

		if (!document.getElementById('csrep-gg-style')) {
			const s = document.createElement('style');
			s.id = 'csrep-gg-style';
			s.textContent = '.csrep-btn{display:flex;width:100%;height:auto;min-height:3rem;padding:8px 0;align-items:center;justify-content:center;color:#fff;font-weight:800;background-color:#1a1a1a;border-radius:5px;cursor:pointer;text-decoration:none;border:none;outline:none;margin:10px 0;box-sizing:border-box;overflow:visible}.csrep-btn:hover{background-color:#2d3748;text-decoration:none!important}.csrep-logo{height:30px;width:auto;display:block}';
			document.head?.appendChild(s);
		}

		const div = document.createElement('div');
		div.className = 'account-row csrep-gg-container';
		const a = document.createElement('a');
		a.href = 'https://csrep.gg/player/' + steamId;
		a.className = 'csrep-btn';
		const img = document.createElement('img');
		img.className = 'csrep-logo';
		img.alt = 'CSREP';
		img.src = logoDataUrl;
		a.appendChild(img);
		div.appendChild(a);
		col.insertBefore(div, col.children[1] ?? null);
	}

	if (document.querySelector('.profile_rightcol')) {
		inject();
	} else {
		const obs = new MutationObserver(() => {
			if (document.querySelector('.profile_rightcol')) {
				obs.disconnect();
				inject();
			}
		});
		obs.observe(document.documentElement, { childList: true, subtree: true });
		setTimeout(() => obs.disconnect(), 15000);
	}
}

export function buildInjectionCode(logoDataUrl: string): string {
	return `(${csrepGgInjectMain.toString()})(${JSON.stringify(logoDataUrl)})`;
}
