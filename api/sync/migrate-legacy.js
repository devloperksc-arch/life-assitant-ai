// api/sync/migrate-legacy.js — Vercel Serverless Function Legacy Migration
const { requestHandler } = require('../../server/src/server');

module.exports = async function handler(req, res) {
  return requestHandler(req, res);
};
