#!/usr/bin/env bash
# CodeGraph subagent-start hook — inject project overview into subagents
CODEGRAPH_BIN="${CODEGRAPH_BIN:-/Users/munircallaos/.local/bin/codegraph}"
"$CODEGRAPH_BIN" hook-subagent-start 2>/dev/null || echo '{"continue":true}'
