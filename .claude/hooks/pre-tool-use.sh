#!/usr/bin/env bash
# CodeGraph pre-tool-use hook — inject codebase context before tool execution
CODEGRAPH_BIN="${CODEGRAPH_BIN:-/Users/munircallaos/.local/bin/codegraph}"
"$CODEGRAPH_BIN" hook-pre-tool-use 2>/dev/null || echo '{"continue":true}'
