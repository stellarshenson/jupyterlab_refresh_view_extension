# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

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
