import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

import { IDocumentManager } from '@jupyterlab/docmanager';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

/**
 * Settings interface
 */
interface IRefreshViewSettings {
  notebookScrollRestoration: boolean;
  markdownScrollRestoration: boolean;
  notebookTimeout: number;
  markdownTimeout: number;
}

/**
 * Initialization data for the jupyterlab_refresh_view_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_refresh_view_extension:plugin',
  description:
    'A JupyterLab to allow context menu option to refresh markdown or notebook',
  autoStart: true,
  requires: [IDocumentManager],
  optional: [ICommandPalette, IFileBrowserFactory, ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    docManager: IDocumentManager,
    palette: ICommandPalette | null,
    factory: IFileBrowserFactory | null,
    settingRegistry: ISettingRegistry | null
  ) => {
    console.log(
      'JupyterLab extension jupyterlab_refresh_view_extension is activated!'
    );

    // Settings with defaults
    let settings: IRefreshViewSettings = {
      notebookScrollRestoration: true,
      markdownScrollRestoration: true,
      notebookTimeout: 5000,
      markdownTimeout: 3000
    };

    // Load settings if available
    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(loadedSettings => {
          settings.notebookScrollRestoration = loadedSettings.get('notebookScrollRestoration').composite as boolean;
          settings.markdownScrollRestoration = loadedSettings.get('markdownScrollRestoration').composite as boolean;
          settings.notebookTimeout = loadedSettings.get('notebookTimeout').composite as number;
          settings.markdownTimeout = loadedSettings.get('markdownTimeout').composite as number;
          // console.log('[SETTINGS] Loaded:', settings);

          // Watch for setting changes
          loadedSettings.changed.connect(() => {
            settings.notebookScrollRestoration = loadedSettings.get('notebookScrollRestoration').composite as boolean;
            settings.markdownScrollRestoration = loadedSettings.get('markdownScrollRestoration').composite as boolean;
            settings.notebookTimeout = loadedSettings.get('notebookTimeout').composite as number;
            settings.markdownTimeout = loadedSettings.get('markdownTimeout').composite as number;
            // console.log('[SETTINGS] Updated:', settings);
          });
        })
        .catch(reason => {
          console.error('[SETTINGS] Failed to load settings:', reason);
        });
    }

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

        // console.log(`[FILE] ${context.path}`);

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
                // console.log(`[SAVE] Cell position: index=${targetCellIndex}, offset=${cellOffsetTop}px`);
                break;
              }
            }
          }
          // console.log(`[SAVE] Scroll position: top=${savedScrollTop}px, left=${savedScrollLeft}px, height=${scrollContainer.scrollHeight}px, isNotebook=${cells.length > 0}`);
        }

        try {
          // Reload the document from disk
          await context.revert();

          // console.log(`[REVERT] After revert: scrollTop=${scrollContainer?.scrollTop}px, height=${scrollContainer?.scrollHeight}px`);

          // Determine content type early for timeout selection
          const isNotebook = targetCellIndex >= 0;

          // if (!isNotebook && settings.markdownScrollRestoration) {
          //   console.log(`[MARKDOWN] Adaptive scroll restoration enabled`);
          // }

          // Restore scroll position based on settings
          if (scrollContainer && ((isNotebook && settings.notebookScrollRestoration) || (!isNotebook && settings.markdownScrollRestoration && savedScrollTop > 0))) {

            const restorePosition = () => {
              if (isNotebook) {
                // Notebook: cell-based restoration
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
                return false;
              } else {
                // Markdown: direct scroll position restoration
                scrollContainer.scrollTop = savedScrollTop;
                scrollContainer.scrollLeft = savedScrollLeft;
                return false;
              }
            };

            // Immediately restore to trigger rendering
            // console.log(`[RESTORE-START] Before first restore: scrollTop=${scrollContainer.scrollTop}px`);
            restorePosition();
            // console.log(`[RESTORE-START] After first restore: scrollTop=${scrollContainer.scrollTop}px`);

            // Detect user-initiated scrolling to stop restoration immediately
            let userScrollDetected = false;
            const userScrollHandler = () => {
              userScrollDetected = true;
            };
            scrollContainer.addEventListener('wheel', userScrollHandler, { once: true, passive: true });
            scrollContainer.addEventListener('touchstart', userScrollHandler, { once: true, passive: true });

            // Smart adaptive stabilization - tracks both scroll position AND content height changes
            let attempts = 0;
            let stableCount = 0;
            let lastScrollHeight = scrollContainer.scrollHeight;
            let lastScrollTop = scrollContainer.scrollTop;

            // Check for content that requires longer rendering time
            const hasMermaid = widget.node.querySelector('.jp-RenderedMarkdown pre code.language-mermaid') !== null;
            const images = Array.from(widget.node.querySelectorAll('.jp-RenderedMarkdown img')) as HTMLImageElement[];
            const hasImages = images.length > 0;

            // Track image loading state
            let loadedImageCount = 0;
            const totalImages = images.length;

            // console.log(`[SETUP-IMAGES] Found ${totalImages} images, waiting for load events...`);

            // Setup image load tracking with actual event listeners
            const imageLoadHandler = (img: HTMLImageElement, index: number) => {
              return () => {
                loadedImageCount++;
                // console.log(`[IMAGE-LOAD] Image ${index} loaded: ${img.src.substring(img.src.lastIndexOf('/') + 1, img.src.indexOf('?'))} (${loadedImageCount}/${totalImages})`);

                if (loadedImageCount >= totalImages) {
                  stableCount = 0; // Reset stability counter when all images finish loading
                  // console.log(`[IMAGES-COMPLETE] All ${totalImages} images loaded, resetting stability counter`);
                }
              };
            };

            // Add load listeners to ALL images - even if they appear "complete"
            // This is necessary because JupyterLab refreshes URLs with new tokens
            images.forEach((img, index) => {
              const handler = imageLoadHandler(img, index);
              img.addEventListener('load', handler, { once: true });
              img.addEventListener('error', handler, { once: true });

              // If image is already complete when we attach the listener, trigger immediately
              if (img.complete && img.naturalHeight !== 0) {
                // console.log(`[IMAGE-CACHED] Image ${index} already loaded from cache`);
                handler();
              }
            });

            // Determine which timeout to use based on content type (isNotebook already defined above)
            const timeout = isNotebook ? settings.notebookTimeout : settings.markdownTimeout;
            const maxAttempts = Math.floor(timeout / 100); // converts ms to number of 100ms checks
            const stabilityThreshold = (hasImages || hasMermaid) ? 5 : 3;

            // console.log(`[SETUP] maxAttempts=${maxAttempts}, stabilityThreshold=${stabilityThreshold}, hasMermaid=${hasMermaid}, totalImages=${totalImages}`);

            const intervalId = setInterval(() => {
              // Exit immediately if user starts scrolling
              if (userScrollDetected) {
                clearInterval(intervalId);
                scrollContainer.removeEventListener('wheel', userScrollHandler);
                scrollContainer.removeEventListener('touchstart', userScrollHandler);
                return;
              }

              const currentScrollHeight = scrollContainer.scrollHeight;
              const currentScrollTop = scrollContainer.scrollTop;
              const usedCellBased = restorePosition();

              // Check both scroll position stability AND content height stability
              const scrollStable = Math.abs(currentScrollTop - lastScrollTop) < 1;
              const heightStable = Math.abs(currentScrollHeight - lastScrollHeight) < 1;
              const targetScroll = usedCellBased ? scrollContainer.scrollTop : savedScrollTop;
              const atTarget = Math.abs(currentScrollTop - targetScroll) < 1;

              // console.log(`[RESTORE] Attempt ${attempts}: scrollTop=${currentScrollTop}px, target=${targetScroll}px, height=${currentScrollHeight}px, heightChange=${currentScrollHeight - lastScrollHeight}px, atTarget=${atTarget}, scrollStable=${scrollStable}, heightStable=${heightStable}, imagesLoaded=${_allImagesLoaded}, stable=${stableCount}/${stabilityThreshold}`);

              // Position is truly stable when: at target position, scroll isn't changing, and content height isn't changing
              if (atTarget && scrollStable && heightStable) {
                stableCount++;
                if (stableCount >= stabilityThreshold) {
                  clearInterval(intervalId);
                  // Clean up stabilization phase event listeners
                  scrollContainer.removeEventListener('wheel', userScrollHandler);
                  scrollContainer.removeEventListener('touchstart', userScrollHandler);
                  // Note: Image listeners auto-cleanup via { once: true } option
                  // console.log(`[DONE] Stabilized at ${scrollContainer.scrollTop}px after ${attempts} attempts, imagesLoaded=${loadedImageCount}/${totalImages}`);

                  // Add guard mode for markdown files to fight JupyterLab's scroll restoration
                  if (!isNotebook && settings.markdownScrollRestoration) {
                    let guardAttempts = 0;
                    const maxGuardAttempts = Math.floor(settings.markdownTimeout / 100); // timeout in ms / 100ms per check
                    let guardUserScrollDetected = false;

                    // Detect user-initiated scrolling to exit guard mode immediately
                    const guardUserScrollHandler = () => {
                      guardUserScrollDetected = true;
                    };
                    scrollContainer.addEventListener('wheel', guardUserScrollHandler, { once: true, passive: true });
                    scrollContainer.addEventListener('touchstart', guardUserScrollHandler, { once: true, passive: true });

                    const guardIntervalId = setInterval(() => {
                      // Exit immediately if user starts scrolling
                      if (guardUserScrollDetected) {
                        clearInterval(guardIntervalId);
                        scrollContainer.removeEventListener('wheel', guardUserScrollHandler);
                        scrollContainer.removeEventListener('touchstart', guardUserScrollHandler);
                        return;
                      }

                      const currentPos = scrollContainer.scrollTop;
                      const drift = Math.abs(currentPos - savedScrollTop);

                      if (drift > 1) {
                        scrollContainer.scrollTop = savedScrollTop;
                        scrollContainer.scrollLeft = savedScrollLeft;
                      }

                      guardAttempts++;
                      if (guardAttempts >= maxGuardAttempts) {
                        clearInterval(guardIntervalId);
                        scrollContainer.removeEventListener('wheel', guardUserScrollHandler);
                        scrollContainer.removeEventListener('touchstart', guardUserScrollHandler);
                      }
                    }, 100);
                  }

                  return;
                }
              } else {
                stableCount = 0;
              }

              lastScrollTop = currentScrollTop;
              lastScrollHeight = currentScrollHeight;
              attempts++;

              if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                // Clean up stabilization phase event listeners
                scrollContainer.removeEventListener('wheel', userScrollHandler);
                scrollContainer.removeEventListener('touchstart', userScrollHandler);
                // Note: Image listeners auto-cleanup via { once: true } option
                // console.log(`[TIMEOUT] Max attempts (${maxAttempts}) reached, final scroll: ${scrollContainer.scrollTop}px, imagesLoaded=${loadedImageCount}/${totalImages}`);

                // Take delayed snapshot even on timeout
                setTimeout(() => {
                  console.log(`[SNAPSHOT-3s] scrollTop=${scrollContainer.scrollTop}px, height=${scrollContainer.scrollHeight}px, drift=${Math.abs(scrollContainer.scrollTop - savedScrollTop).toFixed(2)}px`);
                }, 3000);
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
