import { chromium, Page } from 'playwright';

const CONFIG = {
  adsUrl: 'https://essie-careless-representatively.ngrok-free.dev/',
  bannerSelector: '[id^="banner-"][id$="-wrapper"]',

  bannerTimeoutMs: 5000,
  afterClickMs: 3000,
  afterReloadMs: 1000,

  headless: false,
};

async function waitForBanner(page: Page) {
  const banner = page
    .locator(CONFIG.bannerSelector)
    .first();

  await banner.waitFor({
    state: 'visible',
    timeout: CONFIG.bannerTimeoutMs,
  });

  return banner;
}

async function main() {
  const browser = await chromium.launch({
    headless: CONFIG.headless,
  });

  const context = await browser.newContext();

  // =====================================================
  // ADS PAGE - NEVER REPLACE THIS REFERENCE
  // =====================================================

  const adsPage = await context.newPage();

  console.log(
    `Opening Ads page: ${CONFIG.adsUrl}`,
  );

  await adsPage.goto(CONFIG.adsUrl, {
    waitUntil: 'domcontentloaded',
  });

  console.log('Started clicking...');

  // =====================================================
  // DEBUG NAVIGATION
  // =====================================================

  adsPage.on('framenavigated', frame => {
    if (frame === adsPage.mainFrame()) {
      console.log(
        `[ADS NAVIGATION] ${frame.url()}`,
      );
    }
  });

  // =====================================================
  // MAIN LOOP
  // =====================================================

  while (true) {
    try {
      // -------------------------------------------------
      // ALWAYS RESTORE ADS PAGE FIRST
      // -------------------------------------------------

      if (adsPage.url() !== CONFIG.adsUrl) {
        console.log(
          `[${new Date().toISOString()}] Restoring Ads page`,
        );

        await adsPage.goto(CONFIG.adsUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });
      }

      await adsPage.bringToFront();

      console.log(
        `[${new Date().toISOString()}] Ads page ready: ${adsPage.url()}`,
      );

      // -------------------------------------------------
      // FIND BANNER
      // -------------------------------------------------

      let banner;

      try {
        banner = await waitForBanner(adsPage);
      } catch {
        console.log(
          `[${new Date().toISOString()}] Banner not found`,
        );

        // F5 Ads page
        await adsPage.reload({
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        }).catch(() => {});

        await adsPage.waitForTimeout(
          CONFIG.afterReloadMs,
        );

        continue;
      }

      const bannerId = await banner.getAttribute('id');

      console.log(
        `[${new Date().toISOString()}] Found banner: ${bannerId}`,
      );

      // -------------------------------------------------
      // CLICK
      // -------------------------------------------------

      const pagesBefore = context.pages();

      console.log(
        `[${new Date().toISOString()}] Pages before click: ${pagesBefore.length}`,
      );

      await banner.click({
        force: true,
        timeout: 3000,
        noWaitAfter: true,
      });

      console.log(
        `[${new Date().toISOString()}] Clicked banner: ${bannerId}`,
      );

      // -------------------------------------------------
      // WAIT FOR TARGET
      // -------------------------------------------------

      await adsPage.waitForTimeout(
        CONFIG.afterClickMs,
      );

      const pagesAfter = context.pages();

      console.log(
        `[${new Date().toISOString()}] Pages after click: ${pagesAfter.length}`,
      );

      for (const [index, page] of pagesAfter.entries()) {
        console.log(
          `  Tab ${index + 1}: ${page.url()}`,
        );
      }

      // -------------------------------------------------
      // IMPORTANT:
      // ADS PAGE MAY HAVE NAVIGATED TO TARGET.
      // RESTORE IT.
      // -------------------------------------------------

      if (adsPage.url() !== CONFIG.adsUrl) {
        console.log(
          `[${new Date().toISOString()}] Ads page navigated away: ${adsPage.url()}`,
        );

        console.log(
          `[${new Date().toISOString()}] Restoring Ads page...`,
        );

        await adsPage.goto(CONFIG.adsUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });

        console.log(
          `[${new Date().toISOString()}] Ads page restored`,
        );
      }

      // -------------------------------------------------
      // FOCUS ADS PAGE
      // -------------------------------------------------

      await adsPage.bringToFront();

      // -------------------------------------------------
      // F5
      // -------------------------------------------------

      console.log(
        `[${new Date().toISOString()}] F5 Ads page`,
      );

      await adsPage.reload({
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      }).catch(error => {
        console.log(
          `[${new Date().toISOString()}] Reload warning: ${error.message}`,
        );
      });

      console.log(
        `[${new Date().toISOString()}] Ads page URL: ${adsPage.url()}`,
      );

      await adsPage.waitForTimeout(
        CONFIG.afterReloadMs,
      );
    } catch (error: any) {
      console.log(
        `[${new Date().toISOString()}] Loop error: ${error.message}`,
      );

      // Always recover Ads page
      try {
        await adsPage.goto(CONFIG.adsUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });

        await adsPage.bringToFront();
      } catch {}

      await new Promise(resolve =>
        setTimeout(resolve, 2000),
      );
    }
  }
}

main().catch(console.error);