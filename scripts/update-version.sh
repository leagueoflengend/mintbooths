#!/bin/bash

# Get the last tag from git
LAST_TAG=$(git describe --tags --abbrev=0)

if [ -z "$LAST_TAG" ]; then
  echo "No tags found!"
  exit 1
fi

# Extract MAJOR, MINOR, PATCH from the tag (assuming format vMAJOR.MINOR.PATCH)
VERSION=$(echo $LAST_TAG | sed 's/^v//')  # Remove 'v' if exists
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

# Get the commit message
CURRENT_COMMIT_MSG=$(git log -1 --pretty=%B)

# Determine the new version based on commit message
if echo " $CURRENT_COMMIT_MSG " | grep -Eiq " #[mM]ajor "; then
  MAJOR=$((MAJOR + 1))  # Increment MAJOR version if 'major' keyword is found
  MINOR=0                # Reset MINOR and PATCH to 0 after a major update
  PATCH=0
  echo "🛠 Major update detected."
elif echo " $CURRENT_COMMIT_MSG " | grep -Eiq " #[mM]inor "; then
  MINOR=$((MINOR + 1))  # Increment MINOR version if 'minor' keyword is found
  PATCH=0               # Reset PATCH to 0 after a minor update
  echo "🛠 Minor update detected."
else
  PATCH=$((PATCH + 1))  # Increment PATCH version for general updates (like bug fixes)
  echo "🛠 Patch update detected."
fi

# Generate the new version string
NEW_VERSION="v${MAJOR}.${MINOR}.${PATCH}"
echo "Updated version to ${NEW_VERSION}"

# 1. Update NEXT_PUBLIC_APP_VERSION in .env.local
ENV_FILE=".env.local"

if [ -f "$ENV_FILE" ]; then
  sed -i '' "s/^NEXT_PUBLIC_APP_VERSION=.*/NEXT_PUBLIC_APP_VERSION=${NEW_VERSION}/" $ENV_FILE
else
  echo "NEXT_PUBLIC_APP_VERSION=${NEW_VERSION}" >> $ENV_FILE
fi
echo "✅ NEXT_PUBLIC_APP_VERSION updated in .env.local"

# 2. Update NEXT_PUBLIC_APP_VERSION on Vercel
# Remove the old NEXT_PUBLIC_APP_VERSION variable from Vercel production (if it exists)
echo "Removing old NEXT_PUBLIC_APP_VERSION from Vercel..."
vercel env rm NEXT_PUBLIC_APP_VERSION production -y || echo "No existing NEXT_PUBLIC_APP_VERSION variable found, proceeding..."

# Add the new NEXT_PUBLIC_APP_VERSION variable to Vercel production
echo "Adding new NEXT_PUBLIC_APP_VERSION to Vercel..."
echo "$NEW_VERSION" | vercel env add NEXT_PUBLIC_APP_VERSION production

echo "✅ Vercel environment updated with NEXT_PUBLIC_APP_VERSION=$NEW_VERSION"

# 3. Create a new Git tag
echo "Creating new Git tag: $NEW_VERSION"
git tag $NEW_VERSION

# Push the new tag to the remote repository
git push origin $NEW_VERSION

echo "✅ Git tag $NEW_VERSION created and pushed."
