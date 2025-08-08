const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { summarizeTextWithGranite } = require('./aiService');

puppeteer.use(StealthPlugin());

const scrapeProductList = async (keyword) => {
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 800 });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

  const products = [];

  for (let pageNumber = 1; pageNumber <= 5; pageNumber++) {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
      keyword
    )}&_sop=12&_ipg=60&_pgn=${pageNumber}`;
    console.log(`Scraping page: ${pageNumber} - ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('.s-item', { timeout: 30000 });
      await new Promise((r) => setTimeout(r, 1500));

      const rawItems = await page.$$eval('li.s-item', (nodes) =>
        nodes.map((el) => {
          const name = el.querySelector('.s-item__title')?.innerText || '';
          const price = el.querySelector('.s-item__price')?.innerText || '';
          const detailUrl = el.querySelector('.s-item__link')?.href || '';
          return { name, price, detailUrl };
        })
      );

      const items = rawItems.filter(
        (item) =>
          item.name &&
          item.price &&
          item.detailUrl &&
          !item.name.toLowerCase().includes('shop on ebay')
      );

      console.log(
        items.length > 0
          ? `✅ Memproses Top 10 dari ${items.length} produk valid di halaman ${pageNumber}`
          : `⚠️ Tidak ada produk valid di halaman ${pageNumber}`
      );

      if (items.length === 0) continue;

      for (const item of items.slice(0, 10)) {
        let description = '-';

        try {
          const detailPage = await browser.newPage();
          await detailPage.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
          );
          await detailPage.goto(item.detailUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000,
          });

          await new Promise((r) => setTimeout(r, 3000));

          const rawDesc = await detailPage.evaluate(() => {
            const selectors = [
              '#viTabs_0_is .ux-layout-section__item',
              '#productDescription',
              '#desc_div',
              '#itemDescription',
              '#viTabs_0_is section',
              '#itemTitle',
            ];
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el && el.innerText.trim()) return el.innerText.trim();
            }
            return null;
          });

          // kalau iframe
          if (!rawDesc) {
            const iframeHandle = await detailPage.$('#desc_ifr');
            if (iframeHandle) {
              const frame = await iframeHandle.contentFrame();
              if (frame) {
                const iframeDesc = await frame.$eval('body', (el) =>
                  el.innerText.trim()
                );
                if (iframeDesc) {
                  description = iframeDesc;
                }
              }
            }
          } else {
            description = rawDesc;
          }

          if (description && description !== '-') {
            description = await summarizeTextWithGranite(description);
          }

          await detailPage.close();
          await new Promise((r) => setTimeout(r, 1000));
        } catch (err) {
          console.warn(`⚠️ Gagal mengambil deskripsi dari: ${item.detailUrl}`);
          console.error(err);
        }

        products.push({
          name: item.name,
          price: item.price,
          detailUrl: item.detailUrl,
          description,
        });
      }

      await new Promise((r) => setTimeout(r, 2000));
    } catch (error) {
      console.error(`❌ Gagal scraping halaman ${pageNumber}:`, error.message);
      break;
    }
  }

  await browser.close();
  return products;
};

module.exports = { scrapeProductList };
