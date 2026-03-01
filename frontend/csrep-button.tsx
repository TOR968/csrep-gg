import { CSREP_LOGO_DATA_URL } from './csrep-logo';

type CreateCsrepButtonOptions = {
	steamId: string;
};

export function createCsrepButton({ steamId }: CreateCsrepButtonOptions): HTMLButtonElement {
	const btn = document.createElement('button');
	btn.type = 'button';
	btn.className = 'csrep-btn';

	const img = document.createElement('img');
	img.className = 'csrep-logo';
	img.alt = 'CSREP';
	img.src = CSREP_LOGO_DATA_URL;

	btn.appendChild(img);

	btn.addEventListener('click', () => {
		window.open(`https://csrep.gg/player/${steamId}`, '_self', 'noopener,noreferrer');
	});

	return btn;
}
