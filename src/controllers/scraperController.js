const { scrapeProductList } = require('../services/scraperService');

const scrapeProducts = async (req, res) => {
  const keyword = req.query.keyword || 'nike';
  try {
    const results = await scrapeProductList(keyword);
    res.json(results);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Failed to scrape products' });
  }
};

module.exports = { scrapeProducts };
