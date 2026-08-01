import { useState } from 'react';
import { definePlugin, ToggleField } from '@steambrew/client';
import { CSREP_LOGO_DATA_URL } from './logo-data-url';
import { initSettings, getSettings, saveSettings } from './services/settings';

const CsrepIcon = () => (
	<img src={CSREP_LOGO_DATA_URL} alt="CSREP" style={{ height: '1em', width: 'auto' }} />
);

const Settings = () => {
	const [openExternal, setOpenExternal] = useState<boolean>(getSettings().openExternal);

	const onToggle = async (checked: boolean) => {
		setOpenExternal(checked);
		await saveSettings({ ...getSettings(), openExternal: checked });
		setOpenExternal(getSettings().openExternal);
	};

	return (
		<ToggleField
			label="Open in external browser"
			description="Opens CSrep.gg in your system browser instead of Steam's built-in browser. Useful when the target site is behind Cloudflare, which can block the in-app browser. Reopen profile pages to apply changes."
			checked={openExternal}
			onChange={onToggle}
		/>
	);
};

export default definePlugin(async () => {
	await initSettings();
	return { name: 'csrep-gg', title: 'CSrep.gg', icon: <CsrepIcon />, content: <Settings /> };
});
