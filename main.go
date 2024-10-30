package main

import (
	"context"
	"os"
	"path/filepath"

	"github.com/danthegoodman1/CitizenStats/gologger"
	"github.com/danthegoodman1/CitizenStats/utils"
	"github.com/getlantern/systray"
)

var logger = gologger.NewLogger()

var mode string

func main() {
	switch mode {
	case "install":
		install()
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

func onReady() {

}

func onExit() {

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
	uninstallerPath := filepath.Join(installDir, "uninstall.exe")
	if err := os.WriteFile(uninstallerPath, uninstallerBinary, 0755); err != nil {
		logger.Fatal().Err(err).Msg("failed to write uninstaller")
	}

	// Enable startup for CitizenStats
	if err := utils.ManageStartup(exePath, true); err != nil {
		logger.Fatal().Err(err).Msg("failed to enable startup")
	}

	logger.Info().Str("version", version).Msg("successfully installed")
}

func uninstall() {
	logger.Info().Msg("starting uninstallation")

	installDir := `C:\Program Files\CitizenStats`
	exePath := filepath.Join(installDir, "CitizenStats.exe")

	// Disable startup
	if err := utils.ManageStartup(exePath, false); err != nil {
		logger.Error().Err(err).Msg("failed to disable startup")
		// Continue with uninstall even if this fails
	}

	// Remove the installation directory and all contents
	if err := os.RemoveAll(installDir); err != nil {
		logger.Fatal().Err(err).Msg("failed to remove installation directory")
	}

	logger.Info().Msg("successfully uninstalled")
}
