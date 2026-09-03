# Playwright Ads Automation

Script automation bằng [Playwright](https://playwright.dev/) + TypeScript để tự động:

1. Mở trang ads chạy qua ngrok tunnel
2. Tự click **Visit Site / Open Site** nếu gặp ngrok interstitial page
3. F5 (reload) trang ads
4. Tìm và click banner quảng cáo (selector `[id^="banner-"][id$="-wrapper"]`)
5. Đóng tab đích (target tab) mở ra sau khi click, rồi lặp lại vòng sau

Script chạy **vô hạn (infinite loop)** cho tới khi bấm `Ctrl+C`.

## Yêu cầu

- **Node.js** >= 18 (khuyến nghị LTS)
- **npm**

Kiểm tra phiên bản:

```bash
node -v
npm -v
```

## Cài đặt

```bash
# 1. Cài dependencies
npm install

# 2. Cài browser cho Playwright (chỉ cần Chromium)
npx playwright install chromium
```

> Trên macOS mới có thể cần chạy thêm `npx playwright install-deps` nếu browser báo thiếu thư viện (chủ yếu trên Linux).

## Cấu hình

Mở `index.ts`, sửa block `CONFIG` ở đầu file:

```ts
const CONFIG = {
  ngrokUrl: 'https://xxxx.ngrok-free.dev/', // URL trang ads của bạn

  bannerSelector: '[id^="banner-"][id$="-wrapper"]',

  openSiteSelectors: [ /* nút trên ngrok interstitial */ ],

  openSiteTimeoutMs: 5000,
  bannerTimeoutMs: 10000,

  afterOpenSiteMs: 1000,
  afterClickMs: 2000,
  afterReloadMs: 1000,

  headless: true, // đổi thành false nếu muốn nhìn thấy browser
};
```

| Tham số | Mô tả |
|---|---|
| `ngrokUrl` | URL trang ads đang chạy qua ngrok |
| `bannerSelector` | CSS selector của banner cần click |
| `headless` | `true` = chạy ẩn (không mở cửa sổ browser), `false` = hiển thị browser |
| `afterClickMs` / `afterReloadMs` | Thời gian chờ sau khi click / reload (ms) |

## Chạy local

```bash
npm start
```

Hoặc chạy trực tiếp:

```bash
npx ts-node index.ts
```

Log sẽ in ra terminal kèm timestamp, ví dụ:

```
[2026-09-03T02:00:00.000Z] Found banner: banner-123-wrapper
[2026-09-03T02:00:00.500Z] Clicked banner: banner-123-wrapper
[2026-09-03T02:00:02.500Z] Closing target tab: https://...
[2026-09-03T02:00:03.000Z] F5 Ads page
```

Dừng script: `Ctrl+C`.

## Files

| File | Mô tả |
|---|---|
| `index.ts` | Script chính (bản mới, có xử lý ngrok interstitial + auto-recover) |
| `index copy.ts` | Bản cũ, chỉ để tham khảo — không chạy |
