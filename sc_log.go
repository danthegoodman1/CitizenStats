package main

import (
	"regexp"
	"strings"
	"time"
)

type SCLogLine struct {
	Time    time.Time
	Level   string
	Content string
}

func parseLogLine(logLine string) *SCLogLine {
	// Regular expression to match the components
	// 1st group: timestamp inside <>
	// 2nd group: optional log level inside []
	// 3rd group: remaining content
	re := regexp.MustCompile(`^<([^>]+)>\s*(?:\[([^\]]+)\])?\s*(.+)$`)

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
	var level string
	if matches[2] != "" {
		levelStr := matches[2]
		// Only accept specific log levels
		switch levelStr {
		case "Notice", "Trace", "Warn", "Error":
			level = levelStr
		default:
			// Ignore other log levels
			level = "unknown"
		}
	} else {
		level = "unknown"
	}

	// Get remaining content
	content := strings.TrimSpace(matches[3])

	return &SCLogLine{
		Time:    timestamp,
		Level:   level,
		Content: content,
	}
}
