package main

import (
	"github.com/danthegoodman1/CitizenStats/gologger"
)

var logger = gologger.NewLogger()

func main() {
	logger.Info().Msg("starting")

	// systray.Run(onReady, onExit)
}

func install() {

}
