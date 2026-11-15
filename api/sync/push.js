// api/sync/push.js — Vercel Serverless Function Sync Push
const { requestHandler } = require('../../server/src/server');

module.exports = async function handler(req, res) {
  return requestHandler(req, res);
};
