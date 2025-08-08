require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  replicateApiToken: process.env.REPLICATE_API_TOKEN || '',
};
