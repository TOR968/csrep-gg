import { bootCsrepProfileButton } from '../frontend/csrep';

export default async function WebkitMain() {
	await bootCsrepProfileButton();

	let lastHref = window.location.href;
	let scheduled = false;

	const scheduleBoot = () => {
		if (scheduled) return;
		scheduled = true;
		setTimeout(async () => {
			scheduled = false;
			if (window.location.href !== lastHref) {
				lastHref = window.location.href;
			}
			await bootCsrepProfileButton();
		}, 200);
	};

	const observer = new MutationObserver(() => {
		scheduleBoot();
	});

	if (document.body) {
		observer.observe(document.body, { childList: true, subtree: true });
	} else {
		setTimeout(() => {
			if (document.body) {
				observer.observe(document.body, { childList: true, subtree: true });
			}
		}, 200);
	}

	window.addEventListener('popstate', scheduleBoot);
	window.addEventListener('hashchange', scheduleBoot);
}
