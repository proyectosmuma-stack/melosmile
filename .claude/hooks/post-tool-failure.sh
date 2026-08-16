#!/usr/bin/env bash
# CodeGraph post-tool-failure hook — provide corrective context after failures
CODEGRAPH_BIN="${CODEGRAPH_BIN:-/Users/munircallaos/.local/bin/codegraph}"
"$CODEGRAPH_BIN" hook-post-tool-failure 2>/dev/null || echo '{"continue":true}'
