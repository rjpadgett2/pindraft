#!/usr/bin/env bash
# Regenerate the TypeScript API client from the running backend's OpenAPI spec.
# Run after backend API changes; commits the result.

set -euo pipefail

cd "$(dirname "$0")/.."

# Check the backend is up
if ! curl -sf http://localhost:8080/v3/api-docs > /dev/null; then
  echo "ERROR: Backend not reachable at http://localhost:8080" >&2
  echo "Start it first: cd backend && ./gradlew :application:bootRun" >&2
  exit 1
fi

echo "Regenerating TypeScript API client from /v3/api-docs..."
cd backend
./gradlew :application:generateApiClient

echo ""
echo "Generated client at frontend/libs/api-client/generated/"
echo "Review and update frontend/libs/api-client/src/index.ts if you want apps to use the generated version."
