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

func checkAndDownloadUpdate(ctx context.Context, currentVersion string) ([]byte, []byte, string, error) {
	// Get latest release info from GitHub API
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.github.com/repos/danthegoodman1/CitizenStats/releases/latest", nil)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to check for updates: %w", err)
	}
	defer resp.Body.Close()

	var release Release
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, nil, "", fmt.Errorf("failed to parse release info: %w", err)
	}

	// If we're already on the latest version, return
	if release.TagName == currentVersion {
		return nil, nil, "", nil
	}

	// Find both the citizenstats.exe and uninstaller assets
	var downloadURL, uninstallerURL string
	for _, asset := range release.Assets {
		if asset.Name == "citizenstats.exe" {
			downloadURL = asset.BrowserDownloadURL
		} else if asset.Name == "citizenstats-uninstaller.exe" {
			uninstallerURL = asset.BrowserDownloadURL
		}
	}

	if downloadURL == "" {
		return nil, nil, "", fmt.Errorf("citizenstats.exe not found in release %s", release.TagName)
	}

	// Download the new version
	mainBytes, err := downloadAsset(ctx, downloadURL)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to download main executable: %w", err)
	}

	// Download uninstaller if available
	var uninstallerBytes []byte
	if uninstallerURL != "" {
		uninstallerBytes, err = downloadAsset(ctx, uninstallerURL)
		if err != nil {
			return nil, nil, "", fmt.Errorf("failed to download uninstaller: %w", err)
		}
	}

	return mainBytes, uninstallerBytes, release.TagName, nil
}

// Helper function to download assets
func downloadAsset(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create download request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to download asset: %w", err)
	}
	defer resp.Body.Close()

	bytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read asset body: %w", err)
	}

	return bytes, nil
}
