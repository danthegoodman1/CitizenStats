package main

import (
	"github.com/danthegoodman1/CitizenStats/gologger"
	"github.com/getlantern/systray"
)

var logger = gologger.NewLogger()

func main() {
	logger.Info().Msg("starting")

	systray.Run(onReady, onExit)
}

func onReady() {

}

func onExit() {

}

func install() {

}
