import { app, Tray, Menu, nativeImage } from 'electron';
import { join } from 'path';

const version = app.getVersion();
const icon = nativeImage.createFromPath(join(__dirname, 'assets', 'logo-64.png'));

app.whenReady().then(() => {
	const tray = new Tray(icon.resize({ height: 16, width: 16 }));

	const setTray = () => {
		const contextMenu = Menu.buildFromTemplate([
			{
				label: 'CitizenStats',
				enabled: false,
			},
			{
				label: 'Status: Running',
				enabled: false,
			},
			{
				label: `Version: ${version}`,
				enabled: false,
			},
			{ type: 'separator' },
			{
				label: 'Start at Login',
				type: 'checkbox',
				checked: app.getLoginItemSettings().openAtLogin,
				click(menuItem) {
					app.setLoginItemSettings({
						openAtLogin: menuItem.checked,
						path: app.getPath('exe')
					});
				}
			},
			{
				label: 'Quit',
				click() {
					app.quit();
				},
			},
		]);

		tray.setContextMenu(contextMenu);
		tray.setToolTip('CitizenStats Status');
	};

	setTray();
});
