package main

import (
	"regexp"
	"strings"
	"time"
)

type SCLogLine struct {
	Time    time.Time
	Level   *string
	Kind    *string
	Content string
}

func parseLogLine(logLine string) *SCLogLine {
	re := regexp.MustCompile(`^<([^>]+)>\s*(?:\[([^\]]+)\])?\s*(?:<([^>]+)>)?\s*(.*)$`)

	matches := re.FindStringSubmatch(logLine)
	if matches == nil {
		logger.Warn().Msgf("Failed to find timestamp from log line: %s", logLine)
		return nil
	}

	// Parse timestamp
	timestamp, err := time.Parse(time.RFC3339Nano, matches[1])
	if err != nil {
		logger.Warn().Msgf("Failed to parse timestamp from log line: %s", logLine)
		return nil
	}

	// Handle log level
	var level *string
	if matches[2] != "" {
		levelStr := matches[2]
		// Only accept specific log levels
		switch levelStr {
		case "Notice", "Trace", "Warn", "Error":
			level = &levelStr
		default:
			// Leave as nil for unknown levels
			level = nil
		}
	}

	// Handle Kind
	var kind *string
	if matches[3] != "" {
		kindStr := matches[3]
		kind = &kindStr
	}

	// Get remaining content
	content := strings.TrimSpace(matches[4])

	return &SCLogLine{
		Time:    timestamp,
		Level:   level,
		Kind:    kind,
		Content: content,
	}
}
