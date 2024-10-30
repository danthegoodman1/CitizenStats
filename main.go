package main

import (
	"github.com/danthegoodman1/CitizenStats/gologger"
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

}

func uninstall() {
	logger.Info().Msg("uninstalling")
	// Add uninstallation logic here
}
