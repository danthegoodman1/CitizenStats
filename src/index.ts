import { app, Tray, Menu, nativeImage } from 'electron';
import { join } from 'path';
import { FileTailer } from './tailLog.js';
import { parseAuthLogLine, parseLogLine, SCAuthLogLine } from './SCLog.js';
import log from 'electron-log';
import { LogShipper } from './SCLog.js';
import config from './config.json';
import { updateElectronApp } from 'update-electron-app'

updateElectronApp({
	logger: log,
})

// Add log configuration near the top of the file, after imports
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
log.transports.file.getFile().clear(); // Clear log file on startup

const version = app.getVersion();
let icon;
try {
	const iconPath = join(__dirname, 'assets', 'logo-64.png');
	icon = nativeImage.createFromPath(iconPath);
	if (icon.isEmpty()) {
		log.error(`Failed to load icon from path: ${iconPath}`);
		// Fallback to a blank icon to prevent crashes
		icon = nativeImage.createEmpty();
	} else {
		log.info(`Successfully loaded icon from: ${iconPath}`);
	}
} catch (error) {
	log.error('Error creating icon:', error);
	icon = nativeImage.createEmpty();
}

let tailer: FileTailer | null = null;

// handles the finalization of the squirel setup/update process. E.g. adds start menu icons
if (require('electron-squirrel-startup')) app.quit();

// Add single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit();
} else {
	app.whenReady().then(() => {
		const tray = new Tray(icon.resize({ height: 16, width: 16 }));

		// Set start at login to true by default if it hasn't been set before
		if (!app.getLoginItemSettings().openAtLogin) {
			app.setLoginItemSettings({
				openAtLogin: true,
				path: app.getPath('exe')
			});
		}

		// Initialize log tailer
		const logPath = 'C:\\Program Files\\Roberts Space Industries\\StarCitizen\\LIVE\\Game.log';
		tailer = new FileTailer(logPath);

		let playerInfo: SCAuthLogLine | null = null;
		const logShipper = new LogShipper(config.apiEndpoint);

		// Start tailing when app starts
		tailer.start({
			onLine: (line) => {
				const parsedLine = parseLogLine(line);
				if (parsedLine) {
					// Handle the parsed log line here
					if (!['Corpse', 'Vehicle Destruction', 'Actor Death', 'AccountLoginCharacterStatus_Character'].includes(parsedLine.kind)) {
						// we don't care about other logs
						return
					}

					log.debug('Parsed log of interest:', parsedLine);

					if (parsedLine.kind === 'AccountLoginCharacterStatus_Character') {
						playerInfo = parseAuthLogLine(line);
						if (!playerInfo) {
							log.error('Failed to parse player info from line:', line);
							return;
						}
						log.info('Detected player info:', playerInfo);
						logShipper.setPlayerInfo(playerInfo);
					}

					// Ship the log line
					logShipper.handleLogLine(parsedLine);
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
