import { app, Tray, Menu, nativeImage } from 'electron';
import { join } from 'path';
import { FileTailer } from './tailLog';
import { parseLogLine } from './SCLog';
import log from 'electron-log';

const version = app.getVersion();
const icon = nativeImage.createFromPath(join(__dirname, 'assets', 'logo-64.png'));
let tailer: FileTailer | null = null;

// Add single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit();
} else {
	app.whenReady().then(() => {
		const tray = new Tray(icon.resize({ height: 16, width: 16 }));

		// Initialize log tailer
		const logPath = 'C:\\Program Files\\Roberts Space Industries\\StarCitizen\\LIVE\\Game.log';
		tailer = new FileTailer(logPath);

		// Start tailing when app starts
		tailer.start({
			onLine: (line) => {
				const parsedLine = parseLogLine(line);
				if (parsedLine) {
					// Handle the parsed log line here
					log.info('Parsed log:', parsedLine);
				}
			},
			onError: (error) => {
				log.error('Log tail error:', error);
			}
		});

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
}

// Add after the else block, before the whenReady call
app.on('second-instance', () => {
	// Focus the existing instance's window if you have one
	// Or show a notification that the app is already running
	log.info('Application is already running');
});

// Handle app quit
app.on('before-quit', () => {
	if (tailer) {
		tailer.stop();
	}
});

// Handle window-all-closed event
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
