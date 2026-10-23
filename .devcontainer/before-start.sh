#!/bin/bash
set -euo pipefail

rm -f /tmp/keeweb-ready

occ config:system:set debug --type=boolean --value=true
occ config:system:set overwrite.cli.url --value="http://localhost:${NEXTCLOUD_PORT:-8080}"
occ app:enable keeweb

touch /tmp/keeweb-ready
