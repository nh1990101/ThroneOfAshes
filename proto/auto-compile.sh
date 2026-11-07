#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
exec node proto/auto-compile.js "$@"
