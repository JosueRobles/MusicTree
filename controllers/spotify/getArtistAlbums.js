const axios = require('axios');
const getSpotifyToken = require('./getSpotifyToken');

const getArtistAlbums = async (artistId) => {
  const token = await getSpotifyToken();
  const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    params: {
      include_groups: 'album,single',
      limit: 50,
    },
  });
  return response.data.items;
};

module.exports = getArtistAlbums;