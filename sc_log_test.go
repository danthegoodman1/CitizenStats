package main

import (
	"os"
	"strings"
	"testing"
)

func TestParseLogLines(t *testing.T) {
	// Read the log file
	content, err := os.ReadFile("examplesc.log")
	if err != nil {
		t.Fatalf("Failed to read log file: %v", err)
	}

	// Split into lines and process
	lines := strings.Split(string(content), "\n")
	levelCounts := make(map[string]int)

	for _, line := range lines {
		// Skip empty lines
		if strings.TrimSpace(line) == "" {
			continue
		}

		// Parse the line
		logLine := parseLogLine(line)
		if logLine == nil {
			continue
		}

		// Count levels
		levelCounts[logLine.Level]++
	}

	// Print the results
	t.Logf("Log level counts: %v", levelCounts)
}
