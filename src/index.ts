import { app, Tray, Menu, nativeImage, dialog, shell } from 'electron';
import { join } from 'path';
import { FileTailer } from './tailLog.js';
import { parseAuthLogLine, parseLogLine, SCAuthLogLine } from './SCLog.js';
import log from 'electron-log';
import { LogShipper } from './SCLog.js';
import Store = require('electron-store');
import fetchWithRetry from './fetch.js';

const store = new Store();

// Add log configuration near the top of the file, after imports
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
log.transports.file.getFile().clear(); // Clear log file on startup

interface RegexEntry {
	regex: string
	name: string
}

interface ExpectedClientVersionResponse {
	version: string
}

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
	app.whenReady().then(async () => {
		const tray = new Tray(icon.resize({ height: 16, width: 16 }));

		// Add version check function
		async function checkForUpdates() {
			try {
				const versionRes = await fetchWithRetry('https://api.citizenstats.app/client_version');
				const versionData = await versionRes.json() as ExpectedClientVersionResponse;
				
				if (versionData.version !== version) {
					log.info(`Update available: ${versionData.version}`);
					return versionData.version;
				}
			} catch (error) {
				log.error('Failed to check for updates:', error);
			}
			return null;
		};

		// Set start at login to true by default if it hasn't been set before
		if (!app.getLoginItemSettings().openAtLogin) {
			app.setLoginItemSettings({
				openAtLogin: true,
				path: app.getPath('exe')
			});
		}

		// Initialize log tailer
		const logPath = store.get('logPath', 'C:\\Program Files\\Roberts Space Industries\\StarCitizen\\LIVE\\Game.log') as string;
		tailer = new FileTailer(logPath);

		let playerInfo: SCAuthLogLine | null = null;
		const logShipper = new LogShipper('https://api.citizenstats.app/logs');
		let location: 'pu' | 'ac' | null = null;

		const regexRes = await fetchWithRetry('https://api.citizenstats.app/regex');
		const regexData = await regexRes.json() as { regex: RegexEntry[] };

		// Start tailing when app starts
		tailer.start({
			onLine: (line) => {
				if (line.includes('Loading screen for pu')) {
					location = 'pu';
				} else if (line.includes('Loading screen for ac') || line.match(/\[.*ArenaCommander.*\]/)) {
					location = 'ac';
				}
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
					logShipper.handleLogLine({
						...parsedLine,
						logLocation: location
					});
				}
			},
			onError: (error) => {
				log.error('Log tail error:', error);
			}
		});

		const setTray = async () => {
			const latestVersion = await checkForUpdates();
			
			const contextMenu = Menu.buildFromTemplate([
				{
					label: 'CitizenStats',
					enabled: false,
				},
				// Add update item if available
				...(latestVersion ? [{
					label: `Update available: ${latestVersion}`,
					click: () => {
						shell.openExternal(`https://github.com/danthegoodman1/CitizenStats/releases/tag/${latestVersion}`);
					}
				}] : []),
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
					label: 'Set Game Log Path',
					click: async () => {
						const result = await dialog.showOpenDialog({
							properties: ['openFile'],
							filters: [
								{ name: 'Log Files', extensions: ['log'] }
							],
							defaultPath: store.get('logPath', 'C:\\Program Files\\Roberts Space Industries\\StarCitizen\\LIVE\\Game.log') as string
						});

						if (!result.canceled && result.filePaths.length > 0) {
							const newPath = result.filePaths[0];
							store.set('logPath', newPath);
							log.info(`Updated log path to: ${newPath}`);

							// Stop the current tailer
							if (tailer) {
								tailer.stop();
							}

							// Relaunch the application
							app.relaunch();
							app.quit();
						}
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
		
		// Check for updates every hour
		setInterval(() => {
			setTray();
		}, 60 * 60 * 1000);
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
