// api/[...slug].js — Vercel Serverless Function Universal Fallback Handler
const { requestHandler } = require('../server/src/server');

module.exports = async function handler(req, res) {
  return requestHandler(req, res);
};
