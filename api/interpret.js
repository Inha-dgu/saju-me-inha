const { callGemini } = require('../lib/gemini-server');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 허용됩니다.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const sajuText = body.sajuText;
    if (!sajuText || typeof sajuText !== 'string') {
      return res.status(400).json({ error: 'sajuText가 필요합니다.' });
    }

    const text = await callGemini(process.env.GEMINI_API_KEY, sajuText);
    return res.status(200).json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : '해석 요청에 실패했습니다.';
    const status = /설정되지 않았습니다/.test(message) ? 500 : 502;
    return res.status(status).json({ error: message });
  }
};
