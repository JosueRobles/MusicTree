const axios = require('axios');
const getSpotifyToken = require('./getSpotifyToken');

const searchArtists = async (query) => {
  const token = await getSpotifyToken();
  const response = await axios.get('https://api.spotify.com/v1/search', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    params: {
      q: query,
      type: 'artist',
      limit: 50,
    },
  });
  return response.data.artists.items.filter(artist => artist.followers.total > 10000000);
};

module.exports = searchArtists;