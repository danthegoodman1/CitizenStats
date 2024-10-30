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
				// Open file with explicit sharing flags for Windows
				file, err := os.OpenFile(filePath, os.O_RDONLY, 0666)
				if err != nil {
					time.Sleep(time.Second)
					continue
				}

				// Seek to last known position
				if _, err := file.Seek(offset, 0); err != nil {
					// Reset offset if seek fails
					offset = 0
				}

				scanner := bufio.NewScanner(file)
				for scanner.Scan() {
					select {
					case <-stop:
						file.Close()
						return
					case lines <- scanner.Text():
						// Get current position, handle potential errors
						newOffset, err := file.Seek(0, 1)
						if err == nil {
							offset = newOffset
						}
					}
				}

				file.Close()
				time.Sleep(time.Second)
			}
		}
	}()

	return lines
}
