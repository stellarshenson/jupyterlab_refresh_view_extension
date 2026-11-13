/**
 * The Refresh View command against a fake application: jsdom has no layout,
 * so the tests set scrollTop and the cell rectangles themselves.
 */

jest.mock('@jupyterlab/application', () => ({}));
jest.mock('@jupyterlab/apputils', () => ({
  Dialog: { cancelButton: () => ({}), warnButton: () => ({}) },
  ICommandPalette: {},
  showDialog: jest.fn()
}));
jest.mock('@jupyterlab/filebrowser', () => ({ IFileBrowserFactory: {} }));
jest.mock('@jupyterlab/docmanager', () => ({ IDocumentManager: {} }));
jest.mock('@jupyterlab/settingregistry', () => ({ ISettingRegistry: {} }));

import { showDialog } from '@jupyterlab/apputils';
import plugin from '../index';

const TAB_SELECTOR = '#jp-main-dock-panel .lm-DockPanel-tabBar .lm-TabBar-tab';

/** A document widget: `inner` is the class of its scroll container. */
function makeDoc(id: string, inner: string, dirty = false) {
  const node = document.createElement('div');
  node.innerHTML = `<div class="${inner}"></div>`;
  const scroller = node.firstElementChild as HTMLElement;
  const context = {
    path: `dir/${id}.md`,
    model: { dirty },
    // The reload re-renders the content, which puts the scroll back at the top
    revert: jest.fn(async () => {
      scroller.scrollTop = 0;
    })
  };
  return { widget: { id, node }, scroller, context };
}

function activate(
  docs: ReturnType<typeof makeDoc>[],
  composite: Record<string, unknown> | null = null
) {
  let options: any;
  const app: any = {
    commands: { addCommand: (_id: string, o: any) => (options = o) },
    shell: {
      currentWidget: docs[0]?.widget ?? null,
      widgets: () => docs.map(d => d.widget)[Symbol.iterator]()
    },
    contextMenu: { addItem: jest.fn() },
    contextMenuHitTest: jest.fn()
  };
  const docManager: any = {
    contextForWidget: (w: any) => docs.find(d => d.widget === w)?.context
  };
  const palette = { addItem: jest.fn() };
  const changed = { connect: jest.fn() };
  const registry = composite && {
    load: () =>
      Promise.resolve({
        get: (key: string) => ({ composite: composite[key] }),
        changed
      })
  };
  (plugin.activate as any)(app, docManager, palette, null, registry);
  return { app, palette, changed, options };
}

describe('Refresh View command', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (showDialog as jest.Mock).mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('reloads the current document from disk and leaves it clean', async () => {
    const doc = makeDoc('a', 'jp-RenderedMarkdown');
    const { options } = activate([doc]);
    await options.execute({});
    expect(doc.context.revert).toHaveBeenCalledTimes(1);
    expect(doc.context.model.dirty).toBe(false);
    expect(showDialog).not.toHaveBeenCalled();
  });

  it('asks before it discards unsaved changes', async () => {
    const doc = makeDoc('a', 'jp-FileEditor', true);
    const { options } = activate([doc]);

    (showDialog as jest.Mock).mockResolvedValue({ button: { accept: false } });
    await options.execute({});
    expect(doc.context.revert).not.toHaveBeenCalled();
    expect(doc.context.model.dirty).toBe(true);

    (showDialog as jest.Mock).mockResolvedValue({ button: { accept: true } });
    await options.execute({});
    expect(doc.context.revert).toHaveBeenCalledTimes(1);
    expect(doc.context.model.dirty).toBe(false);
  });

  it('is enabled only for a widget that has a document context', () => {
    const doc = makeDoc('a', 'jp-FileEditor');
    const { app, options } = activate([doc]);
    expect(options.isEnabled({})).toBe(true);
    app.shell.currentWidget = { id: 'launcher', node: document.body };
    expect(options.isEnabled({})).toBe(false);
    app.shell.currentWidget = null;
    expect(options.isEnabled({})).toBe(false);
  });

  it('registers the document menu, the tab menu and the palette entry', () => {
    const { app, palette } = activate([]);
    const command = 'jupyterlab_refresh_view:refresh';
    expect(app.contextMenu.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ command, selector: '.jp-Document' })
    );
    expect(app.contextMenu.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ command, selector: TAB_SELECTOR })
    );
    expect(palette.addItem).toHaveBeenCalledWith({
      command,
      category: 'File Operations'
    });
  });

  it('refreshes the right-clicked tab, not the current document', async () => {
    const current = makeDoc('a', 'jp-FileEditor');
    const other = makeDoc('b', 'jp-FileEditor');
    const { app, options } = activate([current, other]);
    const tabArgs = (app.contextMenu.addItem as jest.Mock).mock.calls.find(
      ([item]) => item.selector === TAB_SELECTOR
    )[0].args;
    const tab = document.createElement('li');
    tab.className = 'lm-TabBar-tab';
    tab.dataset.id = 'b';
    app.contextMenuHitTest.mockImplementation((test: any) =>
      test(tab) ? tab : undefined
    );

    await options.execute(tabArgs);
    expect(other.context.revert).toHaveBeenCalledTimes(1);
    expect(current.context.revert).not.toHaveBeenCalled();

    // The palette and the document menu pass no `tab`: the current document
    await options.execute({});
    expect(current.context.revert).toHaveBeenCalledTimes(1);
  });

  it('restores the scroll position of a markdown or text document', async () => {
    const doc = makeDoc('a', 'jp-RenderedMarkdown');
    doc.scroller.scrollTop = 120;
    const { options } = activate([doc]);
    await options.execute({});
    expect(doc.scroller.scrollTop).toBe(120);

    // The guard puts back a position that something else moved
    jest.advanceTimersByTime(400);
    doc.scroller.scrollTop = 0;
    jest.advanceTimersByTime(200);
    expect(doc.scroller.scrollTop).toBe(120);
  });

  it.each(['wheel', 'keydown', 'pointerdown', 'touchstart'])(
    'stops restoring when the user scrolls with %s',
    async name => {
      const doc = makeDoc('a', 'jp-RenderedMarkdown');
      doc.scroller.scrollTop = 120;
      const { options } = activate([doc]);
      await options.execute({});
      jest.advanceTimersByTime(400);

      doc.scroller.dispatchEvent(new Event(name, { bubbles: true }));
      doc.scroller.scrollTop = 500;
      jest.advanceTimersByTime(5000);
      expect(doc.scroller.scrollTop).toBe(500);
    }
  );

  it('scrolls a notebook back to the cell that was visible', async () => {
    const doc = makeDoc('a', 'jp-WindowedPanel-outer');
    doc.scroller.innerHTML =
      '<div class="jp-Cell"></div><div class="jp-Cell"></div>';
    const [first, second] = Array.from(doc.scroller.children);
    const rect = (top: number, height = 100) => ({ top, height }) as DOMRect;
    doc.scroller.getBoundingClientRect = () => rect(0, 800);
    first.getBoundingClientRect = () => rect(-500);
    second.getBoundingClientRect = () => rect(20);
    doc.scroller.scrollTop = 600;
    doc.context.revert.mockImplementation(async () => {
      // After the reload the second cell sits 280px lower in the viewport
      second.getBoundingClientRect = () => rect(300);
    });

    const { options } = activate([doc]);
    await options.execute({});
    expect(doc.scroller.scrollTop).toBe(880);
  });

  it('follows the settings, at load and when they change', async () => {
    const composite: Record<string, unknown> = {
      notebookScrollRestoration: true,
      markdownScrollRestoration: false,
      notebookTimeout: 5000,
      markdownTimeout: 3000
    };
    const doc = makeDoc('a', 'jp-RenderedMarkdown');
    const { options, changed } = activate([doc], composite);
    await Promise.resolve();
    await Promise.resolve();

    doc.scroller.scrollTop = 120;
    await options.execute({});
    expect(doc.scroller.scrollTop).toBe(0);

    composite.markdownScrollRestoration = true;
    changed.connect.mock.calls[0][0]();
    doc.scroller.scrollTop = 120;
    await options.execute({});
    expect(doc.scroller.scrollTop).toBe(120);
  });
});
