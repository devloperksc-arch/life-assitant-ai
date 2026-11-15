// api/sync/pull.js — Vercel Serverless Function Sync Pull
const { requestHandler } = require('../../server/src/server');

module.exports = async function handler(req, res) {
  return requestHandler(req, res);
};
