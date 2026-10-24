#!/usr/bin/env bash
# Runs in the empty workspace: puts the approved brief where the skill looks.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p docs/design
cp "$here/fixtures/brief.md" docs/design/brief.md
