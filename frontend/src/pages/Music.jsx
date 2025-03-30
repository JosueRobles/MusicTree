import { useState, useEffect } from 'react';
import axios from 'axios';
import BusquedaAvanzada from '../components/BusquedaAvanzada';
import Planilla from '../components/Planilla';
import MusicTendencias from '../components/MusicTendencias';

const API_URL = "http://localhost:5000";

const Music = () => {
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [canciones, setCanciones] = useState([]);
  const [videos, setVideos] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [artistsRes, albumsRes, cancionesRes, videosRes] = await Promise.all([
          axios.get(`${API_URL}/artistas`),
          axios.get(`${API_URL}/albumes`),
          axios.get(`${API_URL}/canciones`),
          axios.get(`${API_URL}/videos`)
        ]);

        const uniqueArtists = [...new Map(artistsRes.data.map(artist => [artist.id_artista, artist])).values()];
        const uniqueAlbums = [...new Map(albumsRes.data.map(album => [album.id_album, album])).values()];
        
        setArtists(uniqueArtists);
        setAlbums(uniqueAlbums);
        setCanciones(cancionesRes.data);
        setVideos(videosRes.data);

        const combinedItems = [
          ...uniqueArtists.map(artist => ({ name: artist.nombre_artista, image: artist.foto_artista, type: 'artist' })),
          ...uniqueAlbums.map(album => ({ name: album.titulo, image: album.foto_album, type: 'album' })),
          ...cancionesRes.data.map(song => ({ name: song.titulo, image: song.foto_album, type: 'song' })),
          ...videosRes.data.map(video => ({ name: video.titulo, image: video.miniatura, type: 'video' }))
        ];

        setItems(combinedItems);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleAdvancedSearch = (filtros) => {
    const filteredArtistas = artists.filter(artista => 
      (!filtros.termino || artista.nombre_artista.toLowerCase().includes(filtros.termino.toLowerCase())) &&
      (!filtros.genero || artista.genero === filtros.genero) &&
      (!filtros.artista || artista.id_artista === filtros.artista)
    );

    const filteredAlbumes = albums.filter(album => 
      (!filtros.termino || album.titulo.toLowerCase().includes(filtros.termino.toLowerCase())) &&
      (!filtros.anio || new Date(album.fecha_lanzamiento).getFullYear() === parseInt(filtros.anio)) &&
      (!filtros.artista || album.id_artista === filtros.artista)
    );

    const filteredCanciones = canciones.filter(cancion => 
      (!filtros.termino || cancion.titulo.toLowerCase().includes(filtros.termino.toLowerCase()))
    );

    const filteredVideos = videos.filter(video => 
      (!filtros.termino || video.titulo.toLowerCase().includes(filtros.termino.toLowerCase()))
    );

    const combinedItems = [
      ...filteredArtistas.map(artist => ({ name: artist.nombre_artista, image: artist.foto_artista, type: 'artist' })),
      ...filteredAlbumes.map(album => ({ name: album.titulo, image: album.foto_album, type: 'album' })),
      ...filteredCanciones.map(song => ({ name: song.titulo, image: song.foto_album, type: 'song' })),
      ...filteredVideos.map(video => ({ name: video.titulo, image: video.miniatura, type: 'video' }))
    ];

    setItems(combinedItems);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-4xl font-bold my-4">Música en MusicTree</h2>

      <MusicTendencias limit={50} itemsPerPage={10} />

      <BusquedaAvanzada 
        onSearch={handleAdvancedSearch}
        artistas={artists}
        albums={albums}
        canciones={canciones}
        videos={videos}
      />

      <div className="entidad-contadores mb-8">
        <h3 className="text-2xl font-bold mb-4">Resumen de Contenido</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          {[
            { nombre: 'Artistas', cantidad: artists.length },
            { nombre: 'Álbumes', cantidad: albums.length },
            { nombre: 'Canciones', cantidad: canciones.length },
            { nombre: 'Videos', cantidad: videos.length }
          ].map(({ nombre, cantidad }) => (
            <div key={nombre} className="bg-gray-100 p-4 rounded">
              <h4 className="text-lg font-semibold">{nombre}</h4>
              <p className="text-2xl font-bold">{cantidad}</p>
            </div>
          ))}
        </div>
      </div>

      <Planilla items={items} />
    </div>
  );
};

export default Music;