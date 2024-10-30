package main

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestTailFile(t *testing.T) {
	// Create a temporary directory for test files
	tmpDir, err := os.MkdirTemp("", "tail-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	// Create a test file path
	testFile := filepath.Join(tmpDir, "test.log")

	// Test case 1: File doesn't exist initially
	stop := make(chan struct{})
	lines := TailFile(testFile, stop)

	// Create and write to the file
	f, err := os.Create(testFile)
	if err != nil {
		t.Fatal(err)
	}

	// Write initial content
	content := []string{
		"line 1",
		"line 2",
		"line 3",
	}

	for _, line := range content {
		f.WriteString(line + "\n")
	}
	f.Sync()

	// Verify we can read the initial content
	for i, expected := range content {
		select {
		case line := <-lines:
			t.Logf("Received initial line %d: %q", i+1, line)
			if line != expected {
				t.Errorf("line %d: expected %q, got %q", i+1, expected, line)
			}
		case <-time.After(2 * time.Second):
			t.Fatalf("timeout waiting for line %d", i+1)
		}
	}

	// Test case 2: Append more content
	newContent := []string{
		"line 4",
		"line 5",
	}

	for _, line := range newContent {
		f.WriteString(line + "\n")
	}
	f.Sync()

	// Verify we can read the new content
	for i, expected := range newContent {
		select {
		case line := <-lines:
			t.Logf("Received new line %d: %q", i+1, line)
			if line != expected {
				t.Errorf("new line %d: expected %q, got %q", i+1, expected, line)
			}
		case <-time.After(2 * time.Second):
			t.Fatalf("timeout waiting for new line %d", i+1)
		}
	}

	// Clean up
	close(stop)
	f.Close()
}
