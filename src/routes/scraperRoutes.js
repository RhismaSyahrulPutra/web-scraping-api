const express = require('express');
const router = express.Router();
const { scrapeProducts } = require('../controllers/scraperController');

router.get('/', scrapeProducts);

module.exports = router;
