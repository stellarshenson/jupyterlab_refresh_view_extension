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
