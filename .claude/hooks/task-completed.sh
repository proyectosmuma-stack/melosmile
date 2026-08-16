#!/usr/bin/env bash
# CodeGraph task-completed hook — quality gate on task completion
CODEGRAPH_BIN="${CODEGRAPH_BIN:-/Users/munircallaos/.local/bin/codegraph}"
"$CODEGRAPH_BIN" hook-task-completed 2>/dev/null || echo '{"continue":true}'
