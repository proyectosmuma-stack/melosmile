## CodeGraph — Codebase Intelligence

This project is indexed by CodeGraph. **Use CodeGraph MCP tools instead of Grep/Glob/Explore agents for code analysis.** The pre-built index provides instant, semantic, relationship-aware results.

### When to Use CodeGraph (Decision Matrix)

| Instead of... | Use this CodeGraph tool | Why |
|---|---|---|
| Grep/Glob for function definitions | `codegraph_query` | Semantic search, ranked by relevance |
| Explore agent for dependency tracing | `codegraph_dependencies` | Instant dependency tree from index |
| Grep for "who calls X" | `codegraph_callers` | 100% precision, no false positives |
| Reading files to understand flow | `codegraph_find_path` | Shortest call path between two functions |
| Manual file reading for context | `codegraph_context` | Token-budgeted, pre-ranked context assembly |
| Grep for symbol lookup | `codegraph_node` | Direct lookup with relationships + source |
| Explore agent for project overview | `codegraph_structure` | PageRank-ranked overview, instant |
| Grep for references | `codegraph_find_references` | Cross-file, all edge types |
| `git blame` / `git log` in Bash | `codegraph_blame` / `codegraph_file_history` | Structured output, faster |
| Grep for security patterns | `codegraph_scan_security` | OWASP/CWE rules + taint analysis |

### Anti-Patterns (Don't Do This)

- **Don't** launch Explore agents to trace code flow — use `codegraph_dependencies` + `codegraph_callers`
- **Don't** grep for function names — use `codegraph_query` or `codegraph_node`
- **Don't** read 10+ files to understand a module — use `codegraph_structure` + `codegraph_context`
- **Don't** use `git log` via Bash — use `codegraph_file_history` or `codegraph_recent_changes`

### All 44 Tools

**Core (13):** codegraph_query, codegraph_dependencies, codegraph_callers, codegraph_callees, codegraph_impact, codegraph_structure, codegraph_tests, codegraph_context, codegraph_node, codegraph_diagram, codegraph_dead_code, codegraph_frameworks, codegraph_languages
**Git (9):** codegraph_blame, codegraph_file_history, codegraph_recent_changes, codegraph_commit_diff, codegraph_symbol_history, codegraph_branch_info, codegraph_modified_files, codegraph_hotspots, codegraph_contributors
**Security (9):** codegraph_scan_security, codegraph_check_owasp, codegraph_check_cwe, codegraph_explain_vulnerability, codegraph_suggest_fix, codegraph_find_injections, codegraph_taint_sources, codegraph_security_summary, codegraph_trace_taint
**Analysis (7):** codegraph_stats, codegraph_circular_imports, codegraph_project_tree, codegraph_find_references, codegraph_export_map, codegraph_import_graph, codegraph_file
**Data Flow (6):** codegraph_find_path, codegraph_complexity, codegraph_data_flow, codegraph_dead_stores, codegraph_find_uninitialized, codegraph_reaching_defs

### Project Stats
- Languages: javascript (23203), typescript (9679), python (2453), c (102), fortran (88), tsx (42), cpp (24), bash (5), go (1), csharp (1), powershell (1), php (1)
- Symbols: 1952 | Relationships: 3346
