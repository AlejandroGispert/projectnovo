#!/usr/bin/env bash
# Docker Desktop on macOS installs CLI here; Cursor/zsh often miss it in PATH.
export PATH="/Applications/Docker.app/Contents/Resources/bin:${PATH}"
exec docker compose "$@"
