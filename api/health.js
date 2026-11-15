// api/health.js — Vercel Serverless Function Health Check
const { requestHandler } = require('../server/src/server');

module.exports = async function handler(req, res) {
  return requestHandler(req, res);
};
