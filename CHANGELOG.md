# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

## [1.2.35] - 2026-10-31

### Changed

- Upgrade to extension template v4.6.5 and Makefile 1.46

### Fixed

- Take the scoped @stellarshenson/jupyterlab-refresh-view-extension npm name

## [1.2.33] - 2026-09-08

### Changed

- Refreshing a document with unsaved edits now asks for confirmation before the reload discards them, and the document is left clean once it equals the file on disk
- Updated to extension-template v4.6.5 - the standalone `jupyter-builder` 1.2 replaces `@jupyterlab/builder`, eslint moves to the flat config in `eslint.config.mjs`, the licence is declared in the PEP 639 form, the Python floor rises to 3.10, `setup.py` is removed and the development instructions move to `CONTRIBUTING.md`
- Adopted Makefile 1.38 - `publish` now asserts a wheel and an sdist in `dist/` before the npm push, so npm and PyPI cannot diverge on a broken build
- Upgraded dependencies - JupyterLab packages 4.4.10 to 4.6.3, eslint 8.57.1 to 9.39.5 with typescript-eslint 8.70.0, prettier 3.6.2 to 3.9.6
- Pinned `lib0` to 0.2.111 for npm as well as yarn, because the newer typings require TypeScript 5.7 and break the build against the pinned 5.5.4
- Restored the Playwright integration-tests job in the build workflow

## 1.2.28 (2026-08-04)

### Fixed

- Removed a duplicate refresh icon in the HTML viewer header - JupyterLab core already ships a refresh button, so the extension no longer adds its own

### Changed

- HTML file refresh guidance now points to the tab context menu (the removed toolbar button was JupyterLab core's, which does not preserve scroll position)

### Removed

- Unused dependencies `@jupyterlab/docregistry`, `@jupyterlab/ui-components`, `@lumino/disposable` (orphaned by the toolbar button removal)

## 1.2.27 (2026-06-25)

### Added

- Refresh View now works for HTML files opened in the rendered HTML viewer
- Refresh button on the HTML viewer toolbar
- Refresh View item on the document tab context menu

### Changed

- Upgraded `@jupyterlab` dependencies to 4.4.10 (added `@jupyterlab/ui-components`, `@lumino/disposable`)
- Adopted Makefile v1.32 with project-local `.nodeenv` isolation

## 1.2.8 (2025-11-11)

### Bug Fixes

- Fixed critical ReferenceError: Cannot access 'isNotebook' before initialization caused by variable scoping issue
- Fixed TypeScript strict mode error for unused `_allImagesLoaded` variable

### Improvements

- Moved `isNotebook` variable declaration to proper scope (line 144) before first usage
- Removed unused `_allImagesLoaded` variable that only appeared in commented logging
- Cleaned up console output by commenting out all position-related diagnostic logging
- Maintained essential [DONE] completion message for user feedback
- Extension now runs cleanly without runtime errors and passes TypeScript strict mode validation

<!-- <END NEW CHANGELOG ENTRY> -->
