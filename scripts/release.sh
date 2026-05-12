#!/bin/bash

# ECC Release Helper Script
# Usage: ./scripts/release.sh <version>
# Example: ./scripts/release.sh 1.1.2

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 1.1.2"
    exit 1
fi

# Remove 'v' prefix if provided
VERSION="${VERSION#v}"

# Refuse to run on main. The release workflow expects the version
# bump to land via a reviewable PR — committing directly to main
# bypasses CI, code review, and the merge audit trail. If you really
# need to release from main (genuine emergency), comment out this
# guard temporarily; do not add an env-var escape hatch because that
# normalises the wrong path.
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ]; then
    echo "Error: refusing to run release from 'main' branch." >&2
    echo "" >&2
    echo "Version bumps must go through a PR:" >&2
    echo "  1. git checkout -b chore/release-v$VERSION" >&2
    echo "  2. ./scripts/release.sh $VERSION   # re-run on the release branch" >&2
    echo "  3. git push -u origin chore/release-v$VERSION" >&2
    echo "  4. gh pr create --title \"chore: release v$VERSION\" --body \"Bump version to $VERSION\"" >&2
    echo "  5. Merge once CI is green, then push the tag." >&2
    exit 1
fi

echo "Preparing release v$VERSION..."

# 1. Update package.json
echo "Updating package.json..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# 2. Update gemini-extension.json
echo "Updating gemini-extension.json..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" gemini-extension.json

# 3. Update .gemini-plugin/plugin.json
echo "Updating .gemini-plugin/plugin.json..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" .gemini-plugin/plugin.json

echo "Versions updated to $VERSION in all configuration files."

# 4. Git commit and tag
git add package.json gemini-extension.json .gemini-plugin/plugin.json

echo "Committing version bump..."
git commit -m "chore: bump version to $VERSION"

echo "Creating tag v$VERSION..."
git tag "v$VERSION"

echo "Done!"
echo "Next steps:"
echo "1. git push -u origin $BRANCH"
echo "2. gh pr create --title \"chore: release v$VERSION\" --body \"Bump version to $VERSION\""
echo "3. After merge, push the tag: git push origin v$VERSION"
echo "4. Check GitHub Actions for the Release process."
