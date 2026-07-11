const { chromium } = require('playwright');
const path = require('path');

const packs = [
  { url: 'https://quaternius.itch.io/animated-easy-enemies/purchase', file: 'Easy Animated Enemy Pack - Jan 2019.zip' },
  { url: 'https://quaternius.itch.io/lowpoly-animated-monsters/purchase', file: 'Monster Pack Animated by Quaternius.zip' },
  { url: 'https://quaternius.itch.io/lowpoly-medieval-weapons/purchase', file: 'Medieval Weapons Pack by Quaternius.zip' },
  { url: 'https://quaternius.itch.io/fantasy-props-megakit/purchase', file: 'Fantasy Props MegaKit[Standard].zip' },
];

async function clickFreeDownload(context, purchasePage) {
  const freeLink = purchasePage.getByText(/No thanks, just take me to the downloads/i).first();
  await freeLink.waitFor({ state: 'visible', timeout: 120000 });

  const popupPromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
  await freeLink.click();
  const popup = await popupPromise;
  const downloadPage = popup ?? context.pages().at(-1) ?? purchasePage;
  await downloadPage.waitForLoadState('domcontentloaded').catch(() => undefined);
  await downloadPage.waitForTimeout(2500);
  return downloadPage;
}

async function locateDownloadButton(downloadPage, filename) {
  const fileLabel = downloadPage.getByText(filename, { exact: true }).first();
  await fileLabel.waitFor({ state: 'visible', timeout: 120000 });

  const uploadRow = fileLabel.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " upload ")][1]');
  if (await uploadRow.count()) {
    const preferred = uploadRow.locator('a.download_btn, a.button, button').filter({ hasText: /download/i }).first();
    if (await preferred.count()) return preferred;
    const anyClickable = uploadRow.locator('a[href], button').first();
    if (await anyClickable.count()) return anyClickable;
  }

  const siblingButton = fileLabel.locator('xpath=following::a[contains(@class,"button") or contains(@class,"download_btn")][1]');
  if (await siblingButton.count()) return siblingButton;

  if ((await fileLabel.evaluate(element => element.tagName.toLowerCase())) === 'a') return fileLabel;
  throw new Error(`No clickable download control found for ${filename}`);
}

async function downloadPack(browser, pack) {
  const context = await browser.newContext({ acceptDownloads: true });
  context.on('page', page => console.log(`Popup opened: ${page.url()}`));
  const purchasePage = await context.newPage();
  purchasePage.setDefaultTimeout(120000);

  console.log(`Opening ${pack.url}`);
  await purchasePage.goto(pack.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const downloadPage = await clickFreeDownload(context, purchasePage);
  console.log(`Using download page ${downloadPage.url()}`);

  const button = await locateDownloadButton(downloadPage, pack.file);
  console.log(`Downloading ${pack.file}`);
  const [download] = await Promise.all([
    downloadPage.waitForEvent('download', { timeout: 120000 }),
    button.click(),
  ]);

  const output = path.join('/tmp/packs', pack.file);
  await download.saveAs(output);
  console.log(`Saved ${output}`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const pack of packs) await downloadPack(browser, pack);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
