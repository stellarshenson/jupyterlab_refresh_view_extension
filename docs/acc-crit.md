# Acceptance Criteria - jupyterlab_refresh_view_extension

A Refresh View command that reloads the open document from disk and keeps the scroll position. One criterion per user-facing feature of `README.md`.

## Authors

- `@kj` Konrad Jelen

## Refresh command `CMD`

The Refresh View command: reload from disk, unsaved changes, when it is enabled

- log: 2026-11-13T09:20:25Z @kj category created

- [x] `ACC-CMD-1-REVERT` **Reload from disk** - CRITICAL; Refresh View reloads the document from disk and leaves the model clean
  - evidence: src/__tests__/refresh.spec.ts 'reloads the current document from disk and leaves it clean' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - test: Jest src/**tests**/refresh.spec.ts 'reloads the current document from disk and leaves it clean'
  - test-tags: UNIT
  - log: 2026-11-13T09:20:25Z @kj added
  - log: 2026-11-13T09:23:25Z @kj closed
- [x] `ACC-CMD-2-DIRTY` **Ask before discarding** - HIGH; a document with unsaved changes shows a Discard dialog; Cancel keeps the changes and does not reload
  - evidence: src/__tests__/refresh.spec.ts 'asks before it discards unsaved changes' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - test: Jest src/**tests**/refresh.spec.ts 'asks before it discards unsaved changes'
  - test-tags: UNIT
  - log: 2026-11-13T09:20:25Z @kj added
  - log: 2026-11-13T09:23:26Z @kj closed
- [x] `ACC-CMD-3-ENABLED` **Enabled for documents only** - MEDIUM; the command is enabled only when the target widget has a document context
  - evidence: src/__tests__/refresh.spec.ts 'is enabled only for a widget that has a document context' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - test: Jest src/**tests**/refresh.spec.ts 'is enabled only for a widget that has a document context'
  - test-tags: UNIT
  - log: 2026-11-13T09:20:25Z @kj added
  - log: 2026-11-13T09:23:26Z @kj closed

## Menus `MENU`

Where the command is offered: document context menu, tab context menu, command palette

- log: 2026-11-13T09:20:25Z @kj category created

- [x] `ACC-MENU-4-CONTENT` **Document context menu** - HIGH; Refresh View is in the context menu of selector .jp-Document
  - evidence: src/__tests__/refresh.spec.ts 'registers the document menu, the tab menu and the palette entry' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - test: Jest src/**tests**/refresh.spec.ts 'registers the document menu, the tab menu and the palette entry'
  - test-tags: UNIT
  - log: 2026-11-13T09:20:25Z @kj added
  - log: 2026-11-13T09:23:26Z @kj closed
- [x] `ACC-MENU-5-TAB` **Tab context menu** - HIGH; Refresh View in the context menu of a main-area tab refreshes the document of the right-clicked tab, also when another tab is current
  - evidence: src/__tests__/refresh.spec.ts 'refreshes the right-clicked tab, not the current document' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - test: Jest src/**tests**/refresh.spec.ts 'refreshes the right-clicked tab, not the current document'
  - test-tags: UNIT
  - log: 2026-11-13T09:20:25Z @kj added
  - log: 2026-11-13T09:23:26Z @kj closed
- [x] `ACC-MENU-6-PALETTE` **Command palette** - MEDIUM; Refresh View is in the command palette under File Operations
  - evidence: src/__tests__/refresh.spec.ts 'registers the document menu, the tab menu and the palette entry' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - test: Jest src/**tests**/refresh.spec.ts 'registers the document menu, the tab menu and the palette entry'
  - test-tags: UNIT
  - log: 2026-11-13T09:20:25Z @kj added
  - log: 2026-11-13T09:23:26Z @kj closed

## Scroll position `SCROLL`

Keeping the reader's position across the reload

- log: 2026-11-13T09:20:25Z @kj category created

- [x] `ACC-SCROLL-7-NOTEBOOK` **Notebook returns to the visible cell** - HIGH; after the reload the first cell that was visible is scrolled back to its earlier offset in the viewport
  - evidence: src/__tests__/refresh.spec.ts 'scrolls a notebook back to the cell that was visible' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - test: Jest src/**tests**/refresh.spec.ts 'scrolls a notebook back to the cell that was visible'
  - test-tags: UNIT
  - log: 2026-11-13T09:20:25Z @kj added
  - log: 2026-11-13T09:23:26Z @kj closed
- [x] `ACC-SCROLL-8-TEXT` **Markdown and text keep scrollTop** - HIGH; after the reload scrollTop is restored, and put back when something else moves it during markdownTimeout
  - evidence: src/__tests__/refresh.spec.ts 'restores the scroll position of a markdown or text document' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - test: Jest src/**tests**/refresh.spec.ts 'restores the scroll position of a markdown or text document'
  - test-tags: UNIT
  - log: 2026-11-13T09:20:25Z @kj added
  - log: 2026-11-13T09:23:26Z @kj closed
- [x] `ACC-SCROLL-9-USER` **User scroll stops restoration** - HIGH; a wheel, touch, key press or pointer press in the document stops the restoration at once
  - evidence: src/__tests__/refresh.spec.ts 'stops restoring when the user scrolls with wheel, keydown, pointerdown, touchstart' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - test: Jest src/**tests**/refresh.spec.ts 'stops restoring when the user scrolls with %s'
  - test-tags: UNIT
  - log: 2026-11-13T09:20:26Z @kj added
  - log: 2026-11-13T09:23:26Z @kj closed

## Settings `SET`

The four settings of schema/plugin.json

- log: 2026-11-13T09:20:26Z @kj category created

- [x] `ACC-SET-10-APPLY` **Settings are applied** - MEDIUM; markdownScrollRestoration false leaves the scroll alone; a changed setting applies to the next refresh without a reload
  - evidence: src/__tests__/refresh.spec.ts 'follows the settings, at load and when they change' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - test: Jest src/**tests**/refresh.spec.ts 'follows the settings, at load and when they change'
  - test-tags: UNIT
  - log: 2026-11-13T09:20:26Z @kj added
  - log: 2026-11-13T09:23:26Z @kj closed
