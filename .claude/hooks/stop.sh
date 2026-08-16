#!/usr/bin/env bash
# CodeGraph stop hook — quality check before agent stops
CODEGRAPH_BIN="${CODEGRAPH_BIN:-/Users/munircallaos/.local/bin/codegraph}"
"$CODEGRAPH_BIN" hook-stop 2>/dev/null || echo '{"continue":true}'
