<!-- @import /home/lab/workspace/.claude/CLAUDE.md -->

# Project-Specific Configuration

This file imports workspace-level configuration from `/home/lab/workspace/.claude/CLAUDE.md`.
All workspace rules apply. Project-specific rules below strengthen or extend them.

The workspace `/home/lab/workspace/.claude/` directory contains additional instruction files
(MERMAID.md, NOTEBOOK.md, DATASCIENCE.md, GIT.md, GITHUB.md, JUPYTERLAB_EXTENSION.md, and others) referenced by CLAUDE.md.
Consult workspace CLAUDE.md and the .claude directory to discover all applicable standards.

## Project Context

JupyterLab extension (TypeScript/Python) providing "Refresh View" context menu command to reload file content from disk while preserving scroll position. Uses intelligent cell-based position tracking for notebooks with windowed rendering.

**Technology Stack**:
- TypeScript with JupyterLab 4.x extension API
- Python packaging via hatch/pyproject.toml
- Jest for unit testing, Playwright for integration tests
- GitHub Actions CI/CD (build + test_isolated)

**Published Registries**:
- npm: `jupyterlab_refresh_view_extension`
- PyPI: `jupyterlab-refresh-view-extension`

## Strengthened Rules

**Publishing Policy** (project-specific - overrides any defaults):
- Do not autopublish or auto install - this is to be done explicitly by user
- Do not create tags unless user explicitly asked for
- Use `make publish` target when user requests publishing (handles version increment, build, npm publish, PyPI upload)

**JupyterLab Extension Standards**:
- Follow JUPYTERLAB_EXTENSION.md for jupyter-releaser CI/CD patterns
- Use Makefile build system for consistent builds
- Verify extension registration via `jupyter labextension list`
