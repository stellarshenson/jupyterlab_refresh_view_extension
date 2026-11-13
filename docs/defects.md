# Defects - jupyterlab_refresh_view_extension

Defects found in audits of the source, against the criteria in `docs/acc-crit.md`.

## Authors

- `@kj` Konrad Jelen

## Menus `MENU`

Where the command is offered and which document it acts on

- log: 2026-11-13T09:20:26Z @kj category created

- [x] `DEF-MENU-1-TAB-TARGET` **Tab menu refreshes the wrong document** - MAJOR; Refresh View from a tab's context menu reloads the current document, not the right-clicked tab; a right-click does not activate a tab; the HTML viewer has only this menu; `src/index.ts`
  - related: ACC-MENU-5-TAB
  - evidence: src/__tests__/refresh.spec.ts 'refreshes the right-clicked tab, not the current document' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - root-cause: 2026-11-13T09:23:26Z @kj execute and isEnabled read app.shell.currentWidget; the tab menu item ran the same command with no hint of the tab under the menu
  - repro: open a.html and b.md, keep b.md current, right-click the a.html tab, Refresh View: b.md reloads
  - test-tags: UNIT
  - log: 2026-11-13T09:20:26Z @kj added
  - log: 2026-11-13T09:23:26Z @kj closed: fixed: tab item passes args tab; command resolves the widget with app.contextMenuHitTest, else currentWidget

## Scroll position `SCROLL`

Restoring and guarding the scroll position after the reload

- log: 2026-11-13T09:20:26Z @kj category created

- [x] `DEF-SCROLL-2-KEY-SCROLL` **Keyboard and scrollbar scroll is put back** - MEDIUM; for markdownTimeout (3 s) after a refresh of a markdown or text file, PageDown, arrow keys and a scrollbar drag are undone every 100 ms; only wheel and touchstart stop the guard; `src/index.ts`
  - related: ACC-SCROLL-9-USER
  - evidence: src/__tests__/refresh.spec.ts 'stops restoring when the user scrolls with keydown' and 'pointerdown' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - root-cause: 2026-11-13T09:23:27Z @kj the stop listeners were wheel and touchstart on the scroll container only; key presses and scrollbar drags never set the stop flag
  - repro: scroll down in a markdown preview, Refresh View, press PageDown within 3 s: the view jumps back
  - test-tags: UNIT
  - log: 2026-11-13T09:20:26Z @kj added
  - log: 2026-11-13T09:23:27Z @kj closed: fixed: one helper listens for wheel, touchstart, keydown, pointerdown on the widget node, capture phase
- [x] `DEF-SCROLL-3-DEBUG-LOG` **Debug line in the browser console** - MINOR; a refresh that reaches the timeout logs '[SNAPSHOT-3s] scrollTop=...' 3 s later; left from debugging; `src/index.ts`
  - evidence: grep -c SNAPSHOT src/index.ts prints 0; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - root-cause: 2026-11-13T09:23:27Z @kj a debugging setTimeout with console.log stayed in the timeout branch
  - repro: refresh a file that became shorter than the saved scroll position, wait 6 s, read the console
  - test-tags: MANUAL
  - log: 2026-11-13T09:20:26Z @kj added
  - log: 2026-11-13T09:23:27Z @kj closed: fixed: timer removed
- [x] `DEF-SCROLL-6-EDITOR-SCROLLER` **Text file jumps to the top on Refresh View** - MAJOR; a text file scrolled down shows line 1 after Refresh View; the scroll is read from .jp-FileEditor, which never scrolls, so the saved scrollTop is 0 and restoration is skipped; `src/index.ts`
  - evidence: src/__tests__/refresh.spec.ts 'restores the scroll position of a text editor' passed; build_test.py 2026-11-13, version 1.2.41: Jest 14 of 14 passed, Galata 1 passed; headless Chromium on a test lab, 3000-line long.txt changed on disk: .cm-scroller scrollTop 21099 before, 21099 at 300, 1500 and 4000 ms after Refresh View; 2 with markdownScrollRestoration false
  - related: ACC-SCROLL-8-TEXT
  - repro: open a long .txt or .py file, scroll down, right-click, Refresh View: the editor shows the top
  - test-tags: UNIT
  - root-cause: 2026-11-13T18:28:00Z @kj CodeMirror scrolls .cm-scroller inside .jp-FileEditor; the command read scrollTop from .jp-FileEditor, always 0, and the gate savedScrollTop > 0 skipped the restoration
  - log: 2026-11-13T18:28:00Z @kj added
  - log: 2026-11-13T18:30:39Z @kj closed: fixed: scroll read from and restored on .jp-FileEditor .cm-scroller; reason: evidence names the test, the build and the browser numbers with their control
- [x] `DEF-SCROLL-7-NB-TIMEOUT` **Long notebook lands at the top** - MEDIUM; Refresh View on a long notebook scrolled far down ends at the top; restoration stops after notebookTimeout (default 5000 ms) while cells are still being attached; a 300-cell notebook had 169 cells attached when it stopped; `src/index.ts`, `schema/plugin.json`
  - evidence: test lab at version 1.2.41 serves the schema with notebookTimeout default 30000; build_test.py 2026-11-13: Jest 14 of 14 passed, Galata 1 passed; review measurement before this change: with 30000 the 300-cell notebook returned to cell 210 between 8 s and 11 s; not measured again on this build
  - repro: open a 300-cell notebook, scroll to cell 210, Refresh View, wait 6 s without input: the top of the notebook stays
  - test-tags: MANUAL
  - root-cause: 2026-11-13T18:28:00Z @kj the 100 ms loop ends after notebookTimeout; under windowingMode contentVisibility a 300-cell notebook attaches cell 210 after 8 s to 11 s, later than the 5000 ms default
  - log: 2026-11-13T18:28:00Z @kj added
  - log: 2026-11-13T18:30:39Z @kj closed: fixed: default notebookTimeout 5000 -> 30000 in src/index.ts and schema/plugin.json; a cell attached later than 30 s is still not reached

## Settings `SET`

Reading the settings

- log: 2026-11-13T09:20:26Z @kj category created

- [x] `DEF-SET-4-DUP-READ` **Settings read written twice** - MINOR; the four settings are copied in two identical blocks, at load and on change; a fifth setting must be added in both; `src/index.ts`
  - evidence: src/__tests__/refresh.spec.ts 'follows the settings, at load and when they change' passed; build_test.py 2026-11-13, version 1.2.40: Jest 13 of 13 passed, Galata 1 passed
  - root-cause: 2026-11-13T09:23:27Z @kj the change handler was a copy of the load block
  - repro: read src/index.ts settingRegistry.load
  - test-tags: UNIT
  - log: 2026-11-13T09:20:26Z @kj added
  - log: 2026-11-13T09:23:27Z @kj closed: fixed: one read function, called at load and connected to changed
- [x] `DEF-SET-9-TIMEOUT-HINT` **notebookTimeout description says to increase a value already at its maximum** - MINOR; settings description of notebookTimeout ends 'Increase for large notebooks with many cells.'; default 30000 equals maximum 30000, so a user on the default cannot enter a higher value; `schema/plugin.json`
  - evidence: grep -c 'Increase for large notebooks' schema/plugin.json prints 0; description reads 'Maximum duration to wait for notebook cell rendering and content stabilization.'
  - repro: open Settings Editor, Refresh View, read the Notebook Stabilization Timeout description, then enter 30001
  - test-tags: MANUAL
  - root-cause: 2026-11-13T18:40:40Z @kj DEF-SCROLL-7-NB-TIMEOUT raised the default from 5000 to the maximum 30000 and left the hint written for the lower default
  - log: 2026-11-13T18:40:40Z @kj added
  - log: 2026-11-13T18:40:40Z @kj closed

## Documentation `DOCS`

README statements the package does not keep

- log: 2026-11-13T09:20:26Z @kj category created

- [x] `DEF-DOCS-5-NPM-INSTALL` **README npm install names the old package** - MINOR; README 'From npm' runs jupyter labextension install jupyterlab_refresh_view_extension; the npm name is @stellarshenson/jupyterlab-refresh-view-extension and the extension is prebuilt, installed with pip; `README.md`
  - evidence: grep -c 'labextension install' README.md prints 0
  - root-cause: 2026-11-13T09:23:28Z @kj README section predates the scoped npm name and the prebuilt packaging
  - repro: run the README command: it installs the old unscoped source package
  - test-tags: MANUAL
  - log: 2026-11-13T09:20:26Z @kj added
  - log: 2026-11-13T09:23:28Z @kj closed: fixed: 'From npm' section removed
- [x] `DEF-DOCS-8-FALSE-CLAIMS` **README states a fallback and a 300ms time the code does not have** - MINOR; README Features says notebooks have a 'scroll coordinate fallback' and restoration is 'stabilizing within 300ms typically'; restorePosition sets nothing when the cell is absent, and measured notebook restoration took 1 s to 20 s; `README.md`
  - evidence: grep -c 'scroll coordinate fallback\|300ms' README.md prints 0
  - repro: read README.md Features, bullets Hybrid Position Tracking and Intelligent Stabilization, against restorePosition in src/index.ts
  - test-tags: MANUAL
  - root-cause: 2026-11-13T18:28:00Z @kj the two bullets describe an earlier design; the code has no scroll coordinate fallback for notebooks and its earliest stop is 3 checks of 100 ms
  - log: 2026-11-13T18:28:00Z @kj added
  - log: 2026-11-13T18:30:39Z @kj closed: fixed: both clauses deleted from README Features
