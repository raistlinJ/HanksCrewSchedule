#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
SOURCE_VERSION="$(awk -F '"' '/"version"[[:space:]]*:/ { print $4; exit }' "$SCRIPT_DIR/rallly-source/package.json")"
SOURCE_REVISION="$(git -C "$SCRIPT_DIR" rev-parse --short HEAD 2>/dev/null || true)"

if ! git -C "$SCRIPT_DIR" diff --quiet --ignore-submodules -- 2>/dev/null; then
  SOURCE_REVISION="${SOURCE_REVISION:+$SOURCE_REVISION-}dirty"
fi

BUILD_VERSION="${APP_VERSION:-${SOURCE_VERSION:-custom}${SOURCE_REVISION:+-$SOURCE_REVISION}}"

echo "Building custom Rallly Docker image (this may take a few minutes)..."
echo "Application version: $BUILD_VERSION"
echo "------------------------------------------------------------------"

# This image is loaded directly into the local Docker engine. Prefer Buildx so
# Docker Desktop does not hang while finalizing an unnecessary provenance
# attestation. Older Docker installations do not support Buildx's --load or
# --provenance flags, so fall back to the classic `docker build` interface.
if docker buildx version >/dev/null 2>&1; then
  BUILD_COMMAND=(docker buildx build --load)
  if docker buildx build --help 2>/dev/null | grep -q -- "--provenance"; then
    BUILD_COMMAND+=(--provenance=false)
  fi
else
  echo "Docker Buildx not found; using the compatible Docker build command."
  BUILD_COMMAND=(docker build)
fi

BUILDX_NO_DEFAULT_ATTESTATIONS=1 DOCKER_BUILDKIT=1 "${BUILD_COMMAND[@]}" \
  --build-arg APP_VERSION="$BUILD_VERSION" \
  --build-arg SELF_HOSTED="true" \
  -t custom-rallly:latest \
  -f "$SCRIPT_DIR/rallly-source/apps/web/Dockerfile" \
  "$SCRIPT_DIR/rallly-source/"

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
