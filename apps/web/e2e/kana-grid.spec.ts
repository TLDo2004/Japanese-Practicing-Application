import { test, expect, type Page } from "@playwright/test";

/**
 * Five columns is a product requirement, not a styling preference: a gojūon row
 * must render あ い う え お on one visual line at every supported width, with
 * no wrapping, no clipped fifth cell and no horizontal page scrolling.
 */
const WIDTHS = [
  { name: "narrow mobile", width: 320, height: 720 },
  { name: "normal mobile", width: 390, height: 844 },
  { name: "large mobile", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
  { name: "wide desktop", width: 1920, height: 1080 },
];

/** Row ids come straight from BASIC_ROWS, so these are real gojūon rows. */
const ROWS = ["a", "ka", "sa", "ta", "na"];

type CellBox = { top: number; bottom: number; left: number; right: number; width: number };

async function rowCells(page: Page, rowIndex: number): Promise<CellBox[]> {
  // +1 skips the vowel heading row, which is also a .kana-row.
  const row = page.locator(".chart-section").first().locator(".kana-row").nth(rowIndex + 1);
  const cells = row.locator(".kana-cell");
  const count = await cells.count();
  const boxes: CellBox[] = [];
  for (let i = 0; i < count; i++) {
    const box = await cells.nth(i).boundingBox();
    if (!box) throw new Error(`cell ${i} of row ${rowIndex} has no box`);
    boxes.push({
      top: box.y,
      bottom: box.y + box.height,
      left: box.x,
      right: box.x + box.width,
      width: box.width,
    });
  }
  return boxes;
}

test.describe("kana chart renders exactly five columns", () => {
  for (const size of WIDTHS) {
    test(`${size.name} (${size.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto("/#/learn/chart/hira");
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(".kana-cell").first()).toBeVisible();

      const viewportWidth = size.width;

      for (let r = 0; r < ROWS.length; r++) {
        const cells = await rowCells(page, r);
        expect(cells, `${ROWS[r]} row cell count`).toHaveLength(5);

        // All five share one visual line. CSS grid cannot wrap; a real wrap
        // would jump by ~a cell height (~44px). Sub-pixel y rounding is not a wrap.
        const tops = cells.map((c) => c.top);
        const spread = Math.max(...tops) - Math.min(...tops);
        expect(spread, `${ROWS[r]} row spans more than one line (spread ${spread})`).toBeLessThan(8);

        // Left-to-right order, all on screen, none zero-width.
        for (let i = 0; i < cells.length; i++) {
          expect(cells[i].width, `${ROWS[r]} cell ${i} width`).toBeGreaterThan(8);
          expect(cells[i].left).toBeGreaterThanOrEqual(-0.5);
          expect(cells[i].right).toBeLessThanOrEqual(viewportWidth + 0.5);
          if (i > 0) expect(cells[i].left).toBeGreaterThanOrEqual(cells[i - 1].right - 1);
        }
      }

      // No horizontal page scrolling at any supported width.
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    });
  }

  test("every filter keeps five columns at the narrowest supported width", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/#/learn/chart/kata");
    for (const filter of ["Basic", "Dakuten", "Yōon", "All"]) {
      await page.getByRole("tab", { name: filter, exact: true }).click();
      await expect(page.locator(".kana-cell").first()).toBeVisible();
      const rows = page.locator(".kana-row").filter({ has: page.locator(".kana-cell") });
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
      for (let i = 0; i < rowCount; i++) {
        await expect(rows.nth(i).locator(".kana-cell")).toHaveCount(5);
      }
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth, `${filter} causes horizontal scroll`).toBeLessThanOrEqual(overflow.clientWidth + 1);
    }
  });
});
