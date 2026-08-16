#!/usr/bin/env bash
# CodeGraph post-edit hook — re-index modified file
CODEGRAPH_BIN="${CODEGRAPH_BIN:-/Users/munircallaos/.local/bin/codegraph}"
"$CODEGRAPH_BIN" hook-post-edit 2>/dev/null || echo '{"continue":true}'
