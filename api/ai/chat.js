// api/ai/chat.js — Vercel Serverless Function Entrypoint
const { authenticateRequest } = require('../../server/src/auth');
const { handleAIChat } = require('../../server/src/ai/router');

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*') || !process.env.NODE_ENV || process.env.NODE_ENV !== 'production')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const auth = await authenticateRequest(req.headers);
    if (!auth.ok) {
      return res.status(auth.status || 401).json({ ok: false, error: auth.error });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const result = await handleAIChat(auth.user, auth.device, body);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    console.error('Vercel API error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
  }
};
