package main

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/danthegoodman1/CitizenStats/icon"
	"github.com/danthegoodman1/CitizenStats/utils"

	"github.com/danthegoodman1/CitizenStats/gologger"
	"github.com/getlantern/systray"
	"golang.org/x/sys/windows"
)

var logger = gologger.NewLogger()

// set with ldflags
var mode string
var Version string

func main() {
	switch mode {
	case "install":
		install()
		// Launch the installed executable as a new process
		exePath := filepath.Join(`C:\Program Files\CitizenStats`, "citizenstats.exe")
		cmd := exec.Command(exePath, "-mode", "run")
		if err := cmd.Start(); err != nil {
			logger.Fatal().Err(err).Msg("failed to start installed executable")
		}
		os.Exit(0)
	case "uninstall":
		uninstall()
	case "run":
		run()
	default:
		logger.Fatal().Msgf("invalid mode '%s', must be one of: install, uninstall, run", mode)
	}
}

func run() {
	logger.Info().Msg("starting")

	systray.Run(onReady, onExit)
}

// see https://github.com/getlantern/systray/blob/master/example/main.go
func onReady() {
	// Set icon from embedded resource
	systray.SetTemplateIcon(icon.Data, icon.Data)

	systray.SetTitle("CitizenStats")
	systray.SetTooltip("CitizenStats Status")

	// Add status menu item (disabled/non-clickable)
	mStatus := systray.AddMenuItem("Status: Running", "Current Status")
	mStatus.Disable()

	// Add version info (disabled/non-clickable)
	mVersion := systray.AddMenuItem("Version: "+Version, "Current Version")
	mVersion.Disable()

	// Add separator
	systray.AddSeparator()

	// Add startup toggle
	startupPath := filepath.Join(`C:\Program Files\CitizenStats`, "citizenstats.exe")
	mStartup := systray.AddMenuItemCheckbox("Start at Login", "Toggle startup at login", true)

	// Add quit button
	mQuit := systray.AddMenuItem("Quit", "Exit CitizenStats")

	// Handle menu items in a goroutine
	go func() {
		for {
			select {
			case <-mStartup.ClickedCh:
				if mStartup.Checked() {
					mStartup.Uncheck()
					if err := utils.ManageStartup(startupPath, false); err != nil {
						logger.Error().Err(err).Msg("failed to disable startup")
						mStartup.Check() // Revert on failure
					}
				} else {
					mStartup.Check()
					if err := utils.ManageStartup(startupPath, true); err != nil {
						logger.Error().Err(err).Msg("failed to enable startup")
						mStartup.Uncheck() // Revert on failure
					}
				}
			case <-mQuit.ClickedCh:
				systray.Quit()
				return
			}
		}
	}()
}

func onExit() {
	logger.Info().Msg("shutting down")
}

func install() {
	logger.Info().Msg("starting installation")

	ctx := context.Background()
	binary, uninstallerBinary, version, err := checkAndDownloadUpdate(ctx, "")
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to download latest version")
	}

	// Create program directory
	installDir := `C:\Program Files\CitizenStats`
	if err := os.MkdirAll(installDir, 0755); err != nil {
		logger.Fatal().Err(err).Msg("failed to create installation directory")
	}

	// Write the binary
	exePath := filepath.Join(installDir, "citizenstats.exe")
	if err := os.WriteFile(exePath, binary, 0755); err != nil {
		logger.Fatal().Err(err).Msg("failed to write executable")
	}

	// Write the uninstaller binary
	uninstallerPath := filepath.Join(installDir, "citizenstats-uninstaller.exe")
	if err := os.WriteFile(uninstallerPath, uninstallerBinary, 0755); err != nil {
		logger.Fatal().Err(err).Msg("failed to write uninstaller")
	}

	// Enable startup for CitizenStats
	if err := utils.ManageStartup(exePath, true); err != nil {
		logger.Fatal().Err(err).Msg("failed to enable startup")
	}

	logger.Info().Msg("successfully installed")

	// Show success message box
	showMessageBox(
		"CitizenStats Installation",
		"CitizenStats has been successfully installed!\n\nThe application will start now, and automatically on login (can be disabled in the system tray menu).",
		windows.MB_OK|windows.MB_ICONINFORMATION,
	)
}

func uninstall() {
	logger.Info().Msg("starting uninstallation")

	installDir := `C:\Program Files\CitizenStats`
	exePath := filepath.Join(installDir, "citizenstats.exe")

	// Disable startup
	if err := utils.ManageStartup(exePath, false); err != nil {
		logger.Error().Err(err).Msg("failed to disable startup")
		// Continue with uninstall even if this fails
	}

	logger.Info().Msg("successfully uninstalled")

	// Show success message box
	showMessageBox(
		"CitizenStats Uninstallation",
		"CitizenStats has been successfully uninstalled. You can now delete the CitizenStats folder.",
		windows.MB_OK|windows.MB_ICONINFORMATION,
	)
}

func showMessageBox(title, message string, flags uint32) {
	caption := windows.StringToUTF16Ptr(title)
	text := windows.StringToUTF16Ptr(message)
	windows.MessageBox(0, text, caption, flags)
}
