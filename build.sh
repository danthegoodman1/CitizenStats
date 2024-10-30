# Read version from VERSION file and trim whitespace
VERSION=$(cat VERSION | tr -d '[:space:]')

# For normal run mode (Windows x86):
GOOS=windows GOARCH=386 go build -ldflags="-X main.Version=${VERSION}"

# For install mode (Windows x86):
GOOS=windows GOARCH=386 go build -ldflags="-X main.Version=${VERSION} -X main.installMode=true"
