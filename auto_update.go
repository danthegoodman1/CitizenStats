package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Release struct {
	TagName string `json:"tag_name"`
	Assets  []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

func checkAndDownloadUpdate(ctx context.Context, currentVersion string) ([]byte, string, error) {

	// Get latest release info from GitHub API
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.github.com/repos/danthegoodman1/CitizenStats/releases/latest", nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("failed to check for updates: %w", err)
	}
	defer resp.Body.Close()

	var release Release
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, "", fmt.Errorf("failed to parse release info: %w", err)
	}

	// If we're already on the latest version, return
	if release.TagName == currentVersion {
		return nil, "", nil
	}

	// Find the citizenstats.exe asset
	var downloadURL string
	for _, asset := range release.Assets {
		if asset.Name == "citizenstats.exe" {
			downloadURL = asset.BrowserDownloadURL
			break
		}
	}

	if downloadURL == "" {
		return nil, "", fmt.Errorf("citizenstats.exe not found in release %s", release.TagName)
	}

	// Download the new version using context
	req, err = http.NewRequestWithContext(ctx, "GET", downloadURL, nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create download request: %w", err)
	}

	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("failed to download update: %w", err)
	}
	defer resp.Body.Close()

	// Read all bytes
	bytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read update body: %w", err)
	}

	return bytes, release.TagName, nil
}
