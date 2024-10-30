package main

import (
	"context"
	"fmt"
	"testing"
)

func TestAutoUpdate(t *testing.T) {
	b, tag, err := checkAndDownloadUpdate(context.Background(), "dev")
	if err != nil {
		t.Fatal(err)
	}
	fmt.Println("tag", tag, "byte len", len(b))
}
