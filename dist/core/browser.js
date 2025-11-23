"use strict";
/**
 * Browser automation using Playwright
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserManager = void 0;
exports.captureAllViewports = captureAllViewports;
const playwright_1 = require("playwright");
const result_js_1 = require("./result.js");
const performance_metrics_js_1 = require("./performance-metrics.js");
class BrowserManager {
    constructor() {
        this.browsers = [];
    }
    async launch() {
        return (0, result_js_1.resultify)(async () => {
            const browser = await playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            this.browsers.push(browser);
            return browser;
        }, (error) => result_js_1.KarenError.browserError('Failed to launch browser', error));
    }
    async captureViewport(browser, url, viewport) {
        return (0, result_js_1.resultify)(async () => {
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
            // Collect performance metrics (Core Web Vitals)
            const performanceMetrics = await (0, performance_metrics_js_1.collectWebVitals)(page);
            // Calculate layout metrics
            const metrics = await this.calculateMetrics(page, performanceMetrics);
            // Get console errors
            const errors = [];
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
        }, (error) => result_js_1.KarenError.browserError(`Failed to capture viewport ${viewport.name}`, error));
    }
    async extractDOM(page) {
        return page.evaluate(() => {
            function extractElement(element) {
                const rect = element.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(element);
                // Convert CSSStyleDeclaration to plain object
                const styleObj = {};
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
            function generateSelector(element) {
                if (element.id)
                    return `#${element.id}`;
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
    async calculateMetrics(page, performanceMetrics) {
        const layoutMetrics = await page.evaluate(() => {
            const allElements = document.querySelectorAll('*');
            const visibleElements = Array.from(allElements).filter((el) => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
            });
            let overflowingElements = 0;
            visibleElements.forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (el.parentElement) {
                    const parentRect = el.parentElement.getBoundingClientRect();
                    if (rect.right > parentRect.right ||
                        rect.bottom > parentRect.bottom) {
                        overflowingElements++;
                    }
                }
            });
            return {
                totalElements: allElements.length,
                visibleElements: visibleElements.length,
                overflowingElements,
            };
        });
        // Calculate performance score from Core Web Vitals
        const performanceScore = (0, performance_metrics_js_1.calculatePerformanceScore)(performanceMetrics);
        // Merge layout metrics with performance metrics
        return {
            ...layoutMetrics,
            performanceScore,
            ...performanceMetrics, // Spread all Core Web Vitals (lcp, cls, inp, etc.)
        };
    }
    async closeAll() {
        await Promise.all(this.browsers.map((browser) => browser.close()));
        this.browsers = [];
    }
}
exports.BrowserManager = BrowserManager;
/**
 * Capture all configured viewports
 */
async function captureAllViewports(url, config) {
    const manager = new BrowserManager();
    try {
        const browserResult = await manager.launch();
        if (browserResult.isErr()) {
            return (0, result_js_1.err)(browserResult.error);
        }
        const browser = browserResult.value;
        const snapshots = [];
        for (const viewport of config.breakpoints) {
            const snapshotResult = await manager.captureViewport(browser, url, viewport);
            if (snapshotResult.isErr()) {
                await manager.closeAll();
                return (0, result_js_1.err)(snapshotResult.error);
            }
            snapshots.push(snapshotResult.value);
        }
        await manager.closeAll();
        return (0, result_js_1.ok)(snapshots);
    }
    catch (error) {
        await manager.closeAll();
        return (0, result_js_1.err)(result_js_1.KarenError.browserError('Failed to capture viewports', error));
    }
}
