import {
  chromium,
  BrowserContext,
  Page,
} from 'playwright';

const CONFIG = {
  ngrokUrl:
    'https://essie-careless-representatively.ngrok-free.dev/',

  bannerSelector:
    '[id^="banner-"][id$="-wrapper"]',

  // Ngrok interstitial button
  openSiteSelectors: [
    'button:has-text("Visit Site")',
    'a:has-text("Visit Site")',
    'button:has-text("Open Site")',
    'a:has-text("Open Site")',
  ],

  openSiteTimeoutMs: 5000,
  bannerTimeoutMs: 10000,

  afterOpenSiteMs: 1000,
  afterClickMs: 2000,
  afterReloadMs: 1000,

  // Không chiếm màn hình / chuột
  headless: true,
};

async function closeOtherTabs(
  context: BrowserContext,
  adsPage: Page,
) {
  const pages = context.pages();

  for (const page of pages) {
    if (
      page !== adsPage &&
      !page.isClosed()
    ) {
      console.log(
        `[${new Date().toISOString()}] Closing target tab: ${page.url()}`,
      );

      await page.close().catch(() => {});
    }
  }
}

async function openNgrokSite(
  page: Page,
): Promise<boolean> {
  for (
    const selector of CONFIG.openSiteSelectors
  ) {
    try {
      const button = page.locator(selector).first();

      await button.waitFor({
        state: 'visible',
        timeout: CONFIG.openSiteTimeoutMs,
      });

      console.log(
        `[${new Date().toISOString()}] Ngrok interstitial detected`,
      );

      console.log(
        `[${new Date().toISOString()}] Clicking: ${selector}`,
      );

      await button.click({
        force: true,
        timeout: 3000,
        noWaitAfter: true,
      });

      await page.waitForTimeout(
        CONFIG.afterOpenSiteMs,
      );

      console.log(
        `[${new Date().toISOString()}] Open Site completed`,
      );

      return true;
    } catch {
      // Try next selector
    }
  }

  // Không có interstitial
  return false;
}

async function ensureAdsPage(
  page: Page,
) {
  /*
   * Open ngrok URL.
   */
  if (!page.url().startsWith(CONFIG.ngrokUrl)) {
    await page.goto(CONFIG.ngrokUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    return;
  }

  /*
   * Nếu đang ở ngrok interstitial,
   * click Visit Site / Open Site.
   */
  await openNgrokSite(page);
}

async function reloadAdsPage(
  page: Page,
) {
  console.log(
    `[${new Date().toISOString()}] F5 Ads page`,
  );

  try {
    await page.reload({
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
  } catch (error: any) {
    console.log(
      `[${new Date().toISOString()}] Reload warning: ${error.message}`,
    );
  }

  /*
   * QUAN TRỌNG:
   *
   * Sau F5 có thể quay về ngrok interstitial.
   * Phải click Open Site.
   */
  await openNgrokSite(page);

  await page.waitForTimeout(
    CONFIG.afterReloadMs,
  );

  console.log(
    `[${new Date().toISOString()}] Page after F5: ${page.url()}`,
  );
}

async function findBanner(
  page: Page,
) {
  try {
    const banner = page
      .locator(CONFIG.bannerSelector)
      .first();

    await banner.waitFor({
      state: 'visible',
      timeout: CONFIG.bannerTimeoutMs,
    });

    return banner;
  } catch {
    return null;
  }
}

async function clickBanner(
  page: Page,
): Promise<boolean> {
  const banner = await findBanner(page);

  if (!banner) {
    console.log(
      `[${new Date().toISOString()}] Banner not found`,
    );

    return false;
  }

  const id = await banner.getAttribute('id');

  console.log(
    `[${new Date().toISOString()}] Found banner: ${id}`,
  );

  try {
    await banner.click({
      force: true,
      timeout: 5000,
      noWaitAfter: true,
    });

    console.log(
      `[${new Date().toISOString()}] Clicked banner: ${id}`,
    );

    return true;
  } catch (error: any) {
    console.log(
      `[${new Date().toISOString()}] Click failed: ${error.message}`,
    );

    return false;
  }
}

async function main() {
  // =========================================================
  // ONE BROWSER
  // =========================================================

  const browser = await chromium.launch({
    headless: CONFIG.headless,
  });

  // =========================================================
  // ONE CONTEXT
  // =========================================================

  const context = await browser.newContext();

  // =========================================================
  // ONE ADS PAGE
  // =========================================================

  const adsPage = await context.newPage();

  console.log(
    `Opening: ${CONFIG.ngrokUrl}`,
  );

  await adsPage.goto(CONFIG.ngrokUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });

  // =========================================================
  // DEBUG NAVIGATION
  // =========================================================

  adsPage.on('framenavigated', frame => {
    if (frame === adsPage.mainFrame()) {
      console.log(
        `[NAVIGATION] ${frame.url()}`,
      );
    }
  });

  // =========================================================
  // TARGET TAB DETECTION
  // =========================================================

  context.on('page', async targetPage => {
    if (targetPage === adsPage) {
      return;
    }

    console.log(
      `[${new Date().toISOString()}] Target tab opened`,
    );

    try {
      await targetPage.waitForLoadState(
        'domcontentloaded',
        {
          timeout: 10000,
        },
      );
    } catch {}

    console.log(
      `[${new Date().toISOString()}] Target URL: ${targetPage.url()}`,
    );
  });

  console.log('QA automation started');

  // =========================================================
  // MAIN LOOP
  // =========================================================

  while (true) {
    try {
      // -----------------------------------------------------
      // 1. CLOSE ALL TARGET TABS
      // -----------------------------------------------------

      await closeOtherTabs(
        context,
        adsPage,
      );

      // -----------------------------------------------------
      // 2. MAKE SURE WE ARE ON NGROK ADS PAGE
      // -----------------------------------------------------

      await ensureAdsPage(adsPage);

      // -----------------------------------------------------
      // 3. IF NGROK INTERSTITIAL EXISTS
      //    CLICK OPEN SITE
      // -----------------------------------------------------

      await openNgrokSite(adsPage);

      // -----------------------------------------------------
      // 4. F5
      // -----------------------------------------------------

      await reloadAdsPage(adsPage);

      // -----------------------------------------------------
      // 5. ENSURE NGROK OPEN SITE AFTER F5
      // -----------------------------------------------------

      await openNgrokSite(adsPage);

      // -----------------------------------------------------
      // 6. FIND + CLICK BANNER
      // -----------------------------------------------------

      const clicked =
        await clickBanner(adsPage);

      // -----------------------------------------------------
      // 7. WAIT FOR TARGET
      // -----------------------------------------------------

      if (clicked) {
        await adsPage.waitForTimeout(
          CONFIG.afterClickMs,
        );
      }

      // -----------------------------------------------------
      // 8. NEXT LOOP
      //    TARGET TABS WILL BE CLOSED
      //    THEN F5 ADS PAGE
      // -----------------------------------------------------

    } catch (error: any) {
      console.log(
        `[${new Date().toISOString()}] Loop error: ${error.message}`,
      );

      /*
       * Recover Ads page.
       */
      try {
        await closeOtherTabs(
          context,
          adsPage,
        );

        if (
          !adsPage.url().startsWith(
            CONFIG.ngrokUrl,
          )
        ) {
          await adsPage.goto(
            CONFIG.ngrokUrl,
            {
              waitUntil:
                'domcontentloaded',
              timeout: 15000,
            },
          );
        }

        await openNgrokSite(
          adsPage,
        );
      } catch {}

      await adsPage.waitForTimeout(
        2000,
      );
    }
  }
}

main().catch(console.error);