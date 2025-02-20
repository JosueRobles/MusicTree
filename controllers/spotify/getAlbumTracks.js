const axios = require('axios');
const getSpotifyToken = require('./getSpotifyToken');

const getAlbumTracks = async (albumId) => {
  const token = await getSpotifyToken();
  const response = await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    params: {
      limit: 50,
    },
  });
  return response.data.items;
};

module.exports = getAlbumTracks;