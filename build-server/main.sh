#!/bin/bash

export GIT_REPOSITORY_URL="$GIT_REPOSITORY_URL"

# TARGET_DIR="$(pwd)/output"
# git clone "$GIT_REPOSITORY_URL" "$TARGET_DIR"
git clone "$GIT_REPOSITORY_URL" /home/app/output

exec node script.js