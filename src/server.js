const express = require('express');
const config = require('./config');
const scraperRoutes = require('./routes/scraperRoutes');

const app = express();
const PORT = config.port;

app.use(express.json());
app.use('/api/scrape', scraperRoutes);

app.listen(PORT, () => {
  console.log(`Server sudah berjalan di Port: ${PORT}`);
});
