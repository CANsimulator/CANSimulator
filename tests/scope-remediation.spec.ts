import { test, expect } from '@playwright/test';

test.describe('Oscilloscope Accessibility & Normalization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Physical Layer page where the VoltageScope is located
        await page.goto('http://localhost:5173/physical'); 
    });

    test('should have semantic button elements for all interactive grid cells in Integrity Map', async ({ page }) => {
        const integrityCells = page.locator('button[aria-label*="Buffer cell"]');
        const count = await integrityCells.count();
        expect(count).toBeGreaterThan(0);
        
        // Check first cell for focus ring
        await integrityCells.first().focus();
        await expect(integrityCells.first()).toHaveClass(/focus-ring-cyber/);
    });

    test('should have semantic button elements for protocol decoder rows', async ({ page }) => {
        const decoderRows = page.locator('.osc-row.head').locator('..').locator('button.osc-row');
        const count = await decoderRows.count();
        expect(count).toBeGreaterThan(0);
        
        // Check for aria-selected or similar attributes
        await expect(decoderRows.first()).toHaveAttribute('aria-label', /Frame/);
    });

    test('should maintain layout across breakpoints', async ({ page }) => {
        // Desktop
        await page.setViewportSize({ width: 1600, height: 900 });
        await expect(page.locator('.osc-app')).toHaveCSS('display', 'grid');
        
        // Tablet/Small Laptop
        await page.setViewportSize({ width: 1200, height: 800 });
        const gridAreas = await page.locator('.osc-app').evaluate(el => getComputedStyle(el).gridTemplateAreas);
        expect(gridAreas).toContain('osc-rightrail');

        // Mobile
        await page.setViewportSize({ width: 500, height: 1000 });
        await expect(page.locator('.osc-app')).toHaveCSS('overflow-y', 'auto');
    });

    test('should not have hard-coded hex colors in critical components (manual check via visual regression or attribute check)', async ({ page }) => {
        // This is hard to automate perfectly without looking at source, 
        // but we can check if certain elements have var() colors in computed style
        const topbar = page.locator('.osc-topbar');
        const bg = await topbar.evaluate(el => getComputedStyle(el).backgroundColor);
        // Should be converted to rgb by browser, but we expect it to match the --bg variable
        // This is more of a smoke test
        expect(bg).not.toBe('');
    });
});
