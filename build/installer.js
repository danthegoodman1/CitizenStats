const electronInstaller = require('electron-winstaller');
const path = require('path');

async function createInstaller() {
  try {
    await electronInstaller.createWindowsInstaller({
      appDirectory: path.join(__dirname, '../out/citizenstats-win32-x64'),
      outputDirectory: path.join(__dirname, '../installers'),
      authors: 'Your Name',
      exe: 'citizenstats.exe',
      name: 'CitizenStats',
      title: 'CitizenStats',
      description: 'CitizenStats Application',
      // iconUrl: path.join(__dirname, '../src/assets/logo.ico'),
      // setupIcon: path.join(__dirname, '../src/assets/logo.ico'),
      noMsi: true,
      loadingGif: path.join(__dirname, '../src/assets/installer.gif'), // optional
      setupExe: 'CitizenStatsSetup.exe'
    });
    console.log('Installer created successfully!');
  } catch (e) {
    console.log(`Error creating installer: ${e.message}`);
  }
}

createInstaller(); 
