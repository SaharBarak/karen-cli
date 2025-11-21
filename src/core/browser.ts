/**
 * Browser automation using Playwright
 */

import { chromium, type Browser, type Page } from 'playwright';
import type { Viewport, KarenConfig } from '../types/config.js';
import type { ViewportSnapshot, DOMElement, LayoutMetrics } from '../types/audit.js';
import { type KarenResult, ok, err, KarenError, resultify } from './result.js';

export class BrowserManager {
  private browsers: Browser[] = [];

  async launch(): Promise<KarenResult<Browser>> {
    return resultify(
      async () => {
        const browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        this.browsers.push(browser);
        return browser;
      },
      (error) => KarenError.browserError('Failed to launch browser', error)
    );
  }

  async captureViewport(
    browser: Browser,
    url: string,
    viewport: Viewport
  ): Promise<KarenResult<ViewportSnapshot>> {
    return resultify(
      async () => {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1,
        });

        const page = await context.newPage();

        // Navigate and wait for network idle
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Take full page screenshot
        const screenshot = await page.screenshot({
          fullPage: true,
          type: 'png',
        });

        // Extract DOM and computed styles
        const dom = await this.extractDOM(page);

        // Calculate layout metrics
        const metrics = await this.calculateMetrics(page);

        // Get console errors
        const errors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        await context.close();

        return {
          viewport,
          screenshot: screenshot.toString('base64'),
          dom,
          styles: {},
          metrics,
          errors,
        };
      },
      (error) =>
        KarenError.browserError(`Failed to capture viewport ${viewport.name}`, error)
    );
  }

  private async extractDOM(page: Page): Promise<DOMElement[]> {
    return page.evaluate(() => {
      interface DOMElement {
        selector: string;
        tagName: string;
        classes: string[];
        id: string;
        rect: { x: number; y: number; width: number; height: number };
        computedStyle: Record<string, string>;
        children: DOMElement[];
      }

      function extractElement(element: any): DOMElement {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);

        // Convert CSSStyleDeclaration to plain object
        const styleObj: Record<string, string> = {};
        for (let i = 0; i < computedStyle.length; i++) {
          const prop = computedStyle[i];
          styleObj[prop] = computedStyle.getPropertyValue(prop);
        }

        return {
          selector: generateSelector(element),
          tagName: element.tagName,
          classes: Array.from(element.classList),
          id: element.id || '',
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          computedStyle: styleObj,
          children: Array.from(element.children).map(extractElement),
        };
      }

      function generateSelector(element: any): string {
        if (element.id) return `#${element.id}`;
        if (element.className) {
          const classes = Array.from(element.classList).join('.');
          return `.${classes}`;
        }
        return element.tagName.toLowerCase();
      }

      const body = document.body;
      return body ? [extractElement(body)] : [];
    });
  }

  private async calculateMetrics(page: Page): Promise<LayoutMetrics> {
    return page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const visibleElements = Array.from(allElements).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      let overflowingElements = 0;
      visibleElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if ((el as HTMLElement).parentElement) {
          const parentRect = (el as HTMLElement).parentElement!.getBoundingClientRect();
          if (
            rect.right > parentRect.right ||
            rect.bottom > parentRect.bottom
          ) {
            overflowingElements++;
          }
        }
      });

      return {
        totalElements: allElements.length,
        visibleElements: visibleElements.length,
        overflowingElements,
        performanceScore: 0, // TODO: Calculate performance score
      };
    });
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.browsers.map((browser) => browser.close()));
    this.browsers = [];
  }
}

/**
 * Capture all configured viewports
 */
export async function captureAllViewports(
  url: string,
  config: KarenConfig
): Promise<KarenResult<ViewportSnapshot[]>> {
  const manager = new BrowserManager();

  try {
    const browserResult = await manager.launch();
    if (browserResult.isErr()) {
      return err(browserResult.error);
    }

    const browser = browserResult.value;
    const snapshots: ViewportSnapshot[] = [];

    for (const viewport of config.breakpoints) {
      const snapshotResult = await manager.captureViewport(browser, url, viewport);
      if (snapshotResult.isErr()) {
        await manager.closeAll();
        return err(snapshotResult.error);
      }
      snapshots.push(snapshotResult.value);
    }

    await manager.closeAll();
    return ok(snapshots);
  } catch (error) {
    await manager.closeAll();
    return err(KarenError.browserError('Failed to capture viewports', error));
  }
}
