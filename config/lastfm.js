const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.LAST_FM_API_KEY;

const lastFmApi = axios.create({
  baseURL: 'http://ws.audioscrobbler.com/2.0/',
  params: {
    api_key: apiKey,
    format: 'json'
  }
});

module.exports = lastFmApi;