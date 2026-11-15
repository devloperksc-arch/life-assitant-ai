// api/ai/health.js — Vercel Serverless Function Safe Health Check
const { getGatewayStatus } = require('../../server/src/ai/router');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const status = getGatewayStatus();
  return res.status(200).json({
    ok: true,
    status: 'online',
    service: 'tadashi-ai-gateway-router',
    timestamp: new Date().toISOString(),
    ...status
  });
};
