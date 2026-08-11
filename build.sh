#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

echo "Building custom Rallly Docker image (this may take a few minutes)..."
echo "------------------------------------------------------------------"

DOCKER_BUILDKIT=1 docker build --build-arg SELF_HOSTED="true" -t custom-rallly:latest -f "$SCRIPT_DIR/rallly-source/apps/web/Dockerfile" "$SCRIPT_DIR/rallly-source/"

echo "------------------------------------------------------------------"
echo "Build complete! Image tagged as custom-rallly:latest"
echo ""

if [ -f "$ENV_FILE" ]; then
  if grep -q "^RALLLY_IMAGE=" "$ENV_FILE"; then
    # MacOS sed vs GNU sed compatibility
    sed -i '' 's|^RALLLY_IMAGE=.*|RALLLY_IMAGE=custom-rallly:latest|' "$ENV_FILE" 2>/dev/null || sed -i 's|^RALLLY_IMAGE=.*|RALLLY_IMAGE=custom-rallly:latest|' "$ENV_FILE"
  else
    echo "RALLLY_IMAGE=custom-rallly:latest" >> "$ENV_FILE"
  fi
  echo "Successfully updated .env to use the custom image."
else
  echo "No .env file found. Remember to run './hcs.sh setup' first."
fi

echo ""
echo "You can now run './hcs.sh restart' to launch your custom application!"
