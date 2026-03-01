import { Millennium } from '@steambrew/webkit';
import { createCsrepButton } from './csrep-button';

const CONTAINER_CLASS = 'csrep-gg-container';
const PROFILE_URL_PATTERN = /steamcommunity\.com\/(id|profiles)\//;
const STYLE_ID = 'csrep-gg-style';

const buttonStyles = `
.csrep-btn {
	display: flex;
	width: 100%;
	height: 3rem;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	color: #fff;
	font-weight: 800;
	transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
	background-color: #1a1a1a;
	border-radius: 5px;
	cursor: pointer;
	text-decoration: none;
	border: none;
	outline: none;
	margin-bottom: 10px;
	margin-top: 10px;
}

.csrep-btn:hover {
	background-color: #2d3748;
	text-decoration: none !important;
}

.csrep-logo {
	height: 35px;
	width: auto;
	display: block;
}
`;

function ensureStyles(doc: Document) {
	if (doc.getElementById(STYLE_ID)) {
		return;
	}

	const styleSheet = doc.createElement('style');
	styleSheet.id = STYLE_ID;
	styleSheet.textContent = buttonStyles;
	doc.head?.appendChild(styleSheet);
}

function normalizeProfileXmlUrl(href: string): string | null {
	if (!href) {
		return null;
	}

	const base = href.split('#')[0]?.split('?')[0]?.replace(/\/$/, '');
	if (!base) {
		return null;
	}

	return `${base}/?xml=1`;
}

async function fetchSteamId(profileUrl: string): Promise<string | null> {
	let profileResponse: Response;
	try {
		profileResponse = await fetch(profileUrl);
	} catch {
		return null;
	}

	if (!profileResponse.ok) {
		return null;
	}

	const profileXmlText = await profileResponse.text();
	const parser = new DOMParser();
	const profileXmlDoc = parser.parseFromString(profileXmlText, 'application/xml');

	const steamId = profileXmlDoc.querySelector('steamID64')?.textContent || '0';
	if (!steamId || steamId === '0') {
		return null;
	}

	return steamId;
}

function renderButton(container: Element, steamId: string) {
	container.appendChild(createCsrepButton({ steamId }));
}

export async function bootCsrepProfileButton() {
	const href = window.location.href ?? '';
	if (!PROFILE_URL_PATTERN.test(href)) {
		return;
	}

	ensureStyles(document);

	let rightCol: any = document.querySelectorAll('.profile_rightcol');
	if (rightCol.length === 0) {
		const found = await Millennium.findElement(document, '.profile_rightcol');
		rightCol = found.length !== undefined ? found : [found];
	}

	if (rightCol.length === 0) {
		return;
	}

	if (rightCol[0].querySelector(`.${CONTAINER_CLASS}`)) {
		return;
	}

	const profileUrl = normalizeProfileXmlUrl(href);
	if (!profileUrl) {
		return;
	}

	const steamId = await fetchSteamId(profileUrl);
	if (!steamId) {
		return;
	}

	const container = document.createElement('div');
	container.className = `account-row ${CONTAINER_CLASS}`;
	renderButton(container, steamId);

	rightCol[0].insertBefore(container, rightCol[0].children[1] ?? null);
}
