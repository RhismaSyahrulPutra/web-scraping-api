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
            waitUntil: 'domcontentloaded',
            timeout: 45000,
          });

          await new Promise((r) => setTimeout(r, 1500));

          const rawDesc = await detailPage.evaluate(() => {
            /* eslint-disable no-undef, no-unused-vars */
            try {
              const section = document.querySelector(
                '#viTabs_0_is .ux-layout-section__item'
              );
              const iframe = document.querySelector('#desc_ifr');
              const shortDesc = document.querySelector('#itemTitle');
              return (
                section?.innerText?.trim() ||
                iframe?.innerText?.trim() ||
                shortDesc?.innerText?.trim() ||
                '-'
              );
            } catch (e) {
              return '-';
            }
            /* eslint-enable no-undef, no-unused-vars */
          });

          if (rawDesc && rawDesc !== '-') {
            description = await summarizeTextWithGranite(rawDesc);
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
