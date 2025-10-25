import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

import { IDocumentManager } from '@jupyterlab/docmanager';

/**
 * Initialization data for the jupyterlab_refresh_view_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_refresh_view_extension:plugin',
  description:
    'A JupyterLab to allow context menu option to refresh markdown or notebook',
  autoStart: true,
  requires: [IDocumentManager],
  optional: [ICommandPalette, IFileBrowserFactory],
  activate: (
    app: JupyterFrontEnd,
    docManager: IDocumentManager,
    palette: ICommandPalette | null,
    factory: IFileBrowserFactory | null
  ) => {
    console.log(
      'JupyterLab extension jupyterlab_refresh_view_extension is activated!'
    );

    const { commands } = app;
    const command = 'jupyterlab_refresh_view:refresh';

    // Add refresh command
    commands.addCommand(command, {
      label: 'Refresh View',
      caption: 'Refresh the current document view without scrolling',
      execute: async () => {
        const widget = app.shell.currentWidget;
        if (!widget) {
          console.log('No current widget');
          return;
        }

        const context = docManager.contextForWidget(widget);
        if (!context) {
          console.log('No context for widget');
          return;
        }

        // Store scroll position
        const scrollPositions = new Map<Element, { top: number; left: number }>();

        // Find all scrollable elements and store their positions
        const scrollableElements = widget.node.querySelectorAll(
          '.jp-RenderedMarkdown, .jp-Notebook, .jp-OutputArea-output, .jp-FileEditor, .jp-MarkdownViewer'
        );
        scrollableElements.forEach(element => {
          scrollPositions.set(element, {
            top: element.scrollTop,
            left: element.scrollLeft
          });
        });

        // Also check for scrollable parent containers
        const scrollableParent = widget.node.querySelector('.jp-WindowedPanel-outer, .lm-Widget');
        if (scrollableParent) {
          scrollPositions.set(scrollableParent, {
            top: scrollableParent.scrollTop,
            left: scrollableParent.scrollLeft
          });
        }

        try {
          // Reload the document from disk
          await context.revert();

          // Restore scroll positions after a short delay to allow rendering
          setTimeout(() => {
            scrollPositions.forEach((position, element) => {
              if (element && element.parentNode) {
                element.scrollTop = position.top;
                element.scrollLeft = position.left;
              }
            });
          }, 150);

          console.log(`Refreshed: ${context.path}`);
        } catch (error) {
          console.error('Failed to refresh document:', error);
        }
      },
      isEnabled: () => {
        const widget = app.shell.currentWidget;
        if (!widget) {
          return false;
        }
        const context = docManager.contextForWidget(widget);
        return context !== undefined;
      }
    });

    // Add command to palette if available
    if (palette) {
      palette.addItem({ command, category: 'File Operations' });
    }

    // Add context menu item for documents (single registration for all document types)
    // Use a more specific selector that won't overlap
    app.contextMenu.addItem({
      command: command,
      selector: '.jp-Document',
      rank: 0
    });

    console.log('Context menu items registered for refresh view extension');
  }
};

export default plugin;
