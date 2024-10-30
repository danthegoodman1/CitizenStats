package utils

import (
	"fmt"
	"golang.org/x/sys/windows/registry"
	"os"
	"path/filepath"
)

// StartupManager handles enabling/disabling programs at Windows startup
func ManageStartup(binaryPath string, enable bool) error {
	// Validate binary path
	if !filepath.IsAbs(binaryPath) {
		absPath, err := filepath.Abs(binaryPath)
		if err != nil {
			return fmt.Errorf("failed to get absolute path: %w", err)
		}
		binaryPath = absPath
	}

	// Check if file exists
	if _, err := os.Stat(binaryPath); os.IsNotExist(err) {
		return fmt.Errorf("binary does not exist at path: %s", binaryPath)
	}

	// Open registry key for current user's startup programs
	key, err := registry.OpenKey(registry.CURRENT_USER,
		`Software\Microsoft\Windows\CurrentVersion\Run`,
		registry.ALL_ACCESS)
	if err != nil {
		return fmt.Errorf("failed to open registry key: %w", err)
	}
	defer key.Close()

	// Get program name from binary path
	programName := filepath.Base(binaryPath)

	if enable {
		// Add to startup
		err = key.SetStringValue(programName, binaryPath)
		if err != nil {
			return fmt.Errorf("failed to add program to startup: %w", err)
		}
	} else {
		// Remove from startup
		err = key.DeleteValue(programName)
		if err != nil && err != registry.ErrNotExist {
			return fmt.Errorf("failed to remove program from startup: %w", err)
		}
	}

	return nil
}
