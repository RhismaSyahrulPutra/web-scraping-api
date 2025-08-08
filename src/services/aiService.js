const Replicate = require('replicate');
const config = require('../config');

const replicate = new Replicate({
  auth: config.replicateApiToken,
});

const summarizeTextWithGranite = async (rawText) => {
  try {
    const prompt = `Berikut adalah deskripsi produk:\n\n${rawText}\n\nRingkaslah menjadi 1-2 kalimat yang informatif dan mudah dipahami oleh pembeli.`;

    const output = await replicate.run('ibm-granite/granite-3.3-8b-instruct', {
      input: {
        prompt,
        system_prompt:
          'Kamu adalah asisten AI yang membantu merangkum deskripsi produk e-commerce.',
        temperature: 0.3,
        max_new_tokens: 200,
        top_p: 0.95,
      },
    });
    return Array.isArray(output) ? output.join('') : output;
  } catch (error) {
    console.error('IBM Granite error:', error.message);
    return '-';
  }
};

module.exports = { summarizeTextWithGranite };
