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
        let targetCellIndex = -1;
        let cellOffsetTop = 0;

        if (scrollContainer) {
          savedScrollTop = scrollContainer.scrollTop;
          savedScrollLeft = scrollContainer.scrollLeft;

          // For notebooks, try to find which cell is currently visible
          const cells = Array.from(widget.node.querySelectorAll('.jp-Cell'));
          if (cells.length > 0) {
            const containerRect = scrollContainer.getBoundingClientRect();

            // Find the first cell that's visible in viewport
            for (let i = 0; i < cells.length; i++) {
              const cell = cells[i];
              const cellRect = cell.getBoundingClientRect();
              const relativeTop = cellRect.top - containerRect.top;

              // If cell is visible (top is within viewport or just above it)
              if (relativeTop >= -cellRect.height && relativeTop <= containerRect.height) {
                targetCellIndex = i;
                cellOffsetTop = relativeTop;
                // console.log(`Saving cell position: index=${targetCellIndex}, offset=${cellOffsetTop}`);
                break;
              }
            }
          }
          // console.log(`Saving scroll position: top=${savedScrollTop}, left=${savedScrollLeft}`);
        }

        try {
          // Reload the document from disk
          await context.revert();

          // Restore position - prefer cell-based restoration for notebooks
          if (scrollContainer && (targetCellIndex >= 0 || savedScrollTop > 0)) {
            const restorePosition = () => {
              // Try cell-based restoration first
              if (targetCellIndex >= 0) {
                const cells = Array.from(widget.node.querySelectorAll('.jp-Cell'));
                if (targetCellIndex < cells.length) {
                  const targetCell = cells[targetCellIndex] as HTMLElement;
                  const containerRect = scrollContainer.getBoundingClientRect();
                  const cellRect = targetCell.getBoundingClientRect();
                  const currentOffset = cellRect.top - containerRect.top;

                  // Scroll to restore the cell to its original offset position
                  scrollContainer.scrollTop += (currentOffset - cellOffsetTop);
                  scrollContainer.scrollLeft = savedScrollLeft;
                  return true;
                }
              }

              // Fallback to scroll position restoration
              scrollContainer.scrollTop = savedScrollTop;
              scrollContainer.scrollLeft = savedScrollLeft;
              return false;
            };

            // Immediately restore to trigger windowed rendering
            restorePosition();

            // Keep restoring until position stabilizes or max attempts reached
            let attempts = 0;
            let stableCount = 0;
            const maxAttempts = 50;
            const intervalId = setInterval(() => {
              const currentScroll = scrollContainer.scrollTop;
              const usedCellBased = restorePosition();

              // Check if scroll position is stable (within 1px of target for 3 consecutive checks)
              const targetScroll = usedCellBased ? scrollContainer.scrollTop : savedScrollTop;
              if (Math.abs(currentScroll - targetScroll) < 1) {
                stableCount++;
                if (stableCount >= 3) {
                  clearInterval(intervalId);
                  // console.log(`Refreshed: ${context.path}, scroll stable at ${scrollContainer.scrollTop}, cell-based: ${usedCellBased}`);
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
