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
	logKindCounts := make(map[string]int)

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
		if logLine.Level != nil {
			levelCounts[*logLine.Level]++
		} else {
			levelCounts["<no-level>"]++
		}

		// Count LogKinds
		if logLine.Kind != nil {
			logKindCounts[*logLine.Kind]++
		} else {
			logKindCounts["<no-kind>"]++
		}
	}

	// Print both results
	t.Logf("Log level counts: %v", levelCounts)
	t.Logf("Log kind counts: %v", logKindCounts)
}
