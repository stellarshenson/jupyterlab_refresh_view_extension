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
          // console.log('No current widget');
          return;
        }

        const context = docManager.contextForWidget(widget);
        if (!context) {
          // console.log('No context for widget');
          return;
        }

        // Find the scrollable container
        const scrollContainer = widget.node.querySelector('.jp-WindowedPanel-outer') ||
                               widget.node.querySelector('.jp-RenderedMarkdown') ||
                               widget.node.querySelector('.jp-FileEditor');

        let savedScrollTop = 0;
        let savedScrollLeft = 0;

        if (scrollContainer) {
          savedScrollTop = scrollContainer.scrollTop;
          savedScrollLeft = scrollContainer.scrollLeft;
          // console.log(`Saving scroll position: top=${savedScrollTop}, left=${savedScrollLeft}`);
        }

        try {
          // Reload the document from disk
          await context.revert();

          // Restore scroll position - keep restoring until content loads
          if (scrollContainer && savedScrollTop > 0) {
            const restoreScroll = () => {
              scrollContainer.scrollTop = savedScrollTop;
              scrollContainer.scrollLeft = savedScrollLeft;
            };

            // Immediately restore to trigger windowed rendering
            restoreScroll();

            // Keep restoring until scroll position stabilizes or max attempts reached
            let attempts = 0;
            let stableCount = 0;
            const maxAttempts = 50;
            const intervalId = setInterval(() => {
              const currentScroll = scrollContainer.scrollTop;
              restoreScroll();

              // Check if scroll position is stable (within 1px of target for 3 consecutive checks)
              if (Math.abs(currentScroll - savedScrollTop) < 1) {
                stableCount++;
                if (stableCount >= 3) {
                  clearInterval(intervalId);
                  // console.log(`Refreshed: ${context.path}, scroll stable at ${scrollContainer.scrollTop}`);
                  return;
                }
              } else {
                stableCount = 0;
              }

              attempts++;
              if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                // console.log(`Refreshed: ${context.path}, max attempts reached, final scroll: ${scrollContainer.scrollTop}`);
              }
            }, 100);
          } else {
            // console.log(`Refreshed: ${context.path}`);
          }

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
