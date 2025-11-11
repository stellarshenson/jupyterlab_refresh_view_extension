# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

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
