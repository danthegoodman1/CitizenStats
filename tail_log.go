package main

import (
	"bufio"
	"os"
	"time"
)

// TailFile watches a file and sends new lines over the returned channel.
// It handles cases where the file doesn't exist yet or gets deleted.
func TailFile(filePath string, stop <-chan struct{}) <-chan string {
	lines := make(chan string)

	go func() {
		defer close(lines)

		var offset int64 = 0
		for {
			select {
			case <-stop:
				return
			default:
				file, err := os.Open(filePath)
				if err != nil {
					// File doesn't exist or can't be opened
					// Wait a bit and retry
					time.Sleep(time.Second)
					continue
				}

				// Seek to last known position
				file.Seek(offset, 0)

				scanner := bufio.NewScanner(file)
				for scanner.Scan() {
					select {
					case <-stop:
						file.Close()
						return
					case lines <- scanner.Text():
						offset, _ = file.Seek(0, 1) // Get current position
					}
				}

				file.Close()

				// If we're here, we either hit EOF or an error
				// Wait a bit before trying again
				time.Sleep(time.Second)
			}
		}
	}()

	return lines
}
