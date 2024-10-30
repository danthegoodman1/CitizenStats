# Get most recent tag, removing the 'v' prefix if present
VERSION=$(git describe --tags --abbrev=0 | sed 's/^v//')

# For normal run mode (Windows x86):
GOOS=windows GOARCH=386 go build -ldflags="-X main.Version=${VERSION} -X main.mode=run"

# For install mode (Windows x86):
GOOS=windows GOARCH=386 go build -ldflags="-X main.Version=${VERSION} -X main.mode=install"

# For uninstall mode (Windows x86):
GOOS=windows GOARCH=386 go build -ldflags="-X main.Version=${VERSION} -X main.mode=uninstall"
