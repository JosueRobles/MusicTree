import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import BarraDeBusqueda from '../components/BarraDeBusqueda';

const API_URL = "http://localhost:5000";

const Music = () => {
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [albumArtists, setAlbumArtists] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const artistsResponse = await axios.get(`${API_URL}/artistas`);
        setArtists(artistsResponse.data);

        const albumsResponse = await axios.get(`${API_URL}/albumes`);
        setAlbums(albumsResponse.data);

        const songsResponse = await axios.get(`${API_URL}/canciones`);
        setSongs(songsResponse.data);

        const albumArtistsResponse = await axios.get(`${API_URL}/album_artistas`);
        setAlbumArtists(albumArtistsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
  };

  const filteredArtists = artists.filter(artist =>
    artist.nombre_artista.toLowerCase().includes(query.toLowerCase())
  );

  const filteredSongs = songs.filter(song =>
    song.titulo.toLowerCase().includes(query.toLowerCase())
  );

  const getAlbumsByArtist = (artistId) => {
    return albumArtists
      .filter(aa => aa.artista_id === artistId)
      .map(aa => albums.find(album => album.id_album === aa.album_id))
      .filter(album => album !== undefined);
  };

  const getSongsByAlbum = (albumId) => {
    return filteredSongs.filter(song => song.album === albumId);
  };

  return (
    <div>
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">Música</h2>
        <BarraDeBusqueda onSearch={handleSearch} />
        <div className="section">
          <h2>Artistas</h2>
          <ul>
            {filteredArtists.map(artist => (
              <li key={artist.id_artista}>
                <Link to={`/artist/${artist.id_artista}`}>
                  <img src={artist.foto_artista} alt={artist.nombre_artista} width="50" />
                  {artist.nombre_artista}
                </Link>
                <ul>
                  {getAlbumsByArtist(artist.id_artista).map(album => (
                    <li key={album.id_album}>
                      <Link to={`/album/${album.id_album}`}>
                        <img src={album.foto_album} alt={album.titulo} width="50" />
                        {album.titulo}
                      </Link>
                      <ul>
                        {getSongsByAlbum(album.id_album).map(song => (
                          <li key={song.id_cancion}>
                            <Link to={`/song/${song.id_cancion}`}>{song.titulo}</Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Music;