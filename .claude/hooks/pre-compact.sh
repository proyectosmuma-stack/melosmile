#!/usr/bin/env bash
# CodeGraph pre-compact hook — save graph summary
CODEGRAPH_BIN="${CODEGRAPH_BIN:-/Users/munircallaos/.local/bin/codegraph}"
"$CODEGRAPH_BIN" hook-pre-compact 2>/dev/null || echo '{"continue":true}'
