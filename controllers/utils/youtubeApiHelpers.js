const axios = require('axios');

// YouTube API Key (ensure to set this in your environment variables)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Function to fetch videos from a YouTube channel
const fetchYoutubeChannelVideos = async (channelId) => {
  let allItems = [];
  let nextPageToken = null;
  do {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: YOUTUBE_API_KEY,
        channelId: channelId,
        part: 'snippet',
        order: 'date',
        maxResults: 50,
        pageToken: nextPageToken,
        type: 'video'
      },
    });
    allItems = allItems.concat(response.data.items);
    nextPageToken = response.data.nextPageToken;
  } while (nextPageToken);
  return allItems;
};

// Function to fetch videos from a YouTube playlist
const fetchYoutubePlaylistVideos = async (playlistId) => {
  let allItems = [];
  let nextPageToken = null;
  try {
    do {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: {
          key: YOUTUBE_API_KEY,
          playlistId: playlistId,
          part: 'snippet',
          maxResults: 50,
          pageToken: nextPageToken,
        },
      });

      allItems = allItems.concat(response.data.items);
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    return allItems;
  } catch (error) {
    console.error('Error fetching playlist videos:', error);
    throw error;
  }
};

const fetchYoutubeVideosDetails = async (videoIds) => {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  let allDetails = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        key: YOUTUBE_API_KEY,
        id: batch.join(','),
        part: 'snippet,contentDetails,statistics'
      }
    });
    allDetails = allDetails.concat(response.data.items);
  }
  return allDetails;
};

function isoDurationToSeconds(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match.map(x => parseInt(x) || 0);
  return h * 3600 + m * 60 + s;
}

function calcularPopularidadCruda(viewCount, publishedAt) {
  const dias = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  const decay = 1 / (1 + (dias / 2000)); // más suave, nunca llega a cero
  return Math.log10(viewCount + 1) * decay;
}

function escalarA100Absoluto(score, maxScore = 20) {
  return Math.min(100, Math.round((score / maxScore) * 100));
}

function escalarPopularidad(videos) {
  const maxViews = Math.max(...videos.map(v => v.view_count));
  return videos.map(v => ({
    ...v,
    popularidad: maxViews ? Math.round((v.view_count / maxViews) * 10000) / 100 : 0
  }));
}

function calcularPopularidadAjustada(viewCount, publishedAt) {
  const dias = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  const scoreHistorico = Math.log10(viewCount + 1);
  const scoreReciente = scoreHistorico * Math.exp(-dias / 1095); // semivida: 3 años

  const score = (0.8 * scoreHistorico) + (0.2 * scoreReciente); // más peso a lo histórico
  const scoreMax = Math.log10(2_000_000_000 + 1); // ≈9.3

  return Math.round((score / scoreMax) * 100);
}

function calcularPopularidadAbsoluta(viewCount, publishedAt) {
  const dias = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  const logViews = Math.log10(viewCount + 1);
  const decay = 1 / (1 + (dias / 2000)); // más suave
  const score = (0.8 * logViews) + (0.2 * (logViews * decay));
  const maxScore = 9; // log10 de 100 mil millones de views
  return Math.round((score / maxScore) * 100);
}

module.exports = {
  fetchYoutubeChannelVideos,
  fetchYoutubePlaylistVideos,
  fetchYoutubeVideosDetails,
  isoDurationToSeconds,
  calcularPopularidadCruda,
  escalarA100Absoluto,
  escalarPopularidad,
  calcularPopularidadAjustada,
  calcularPopularidadAbsoluta,
};