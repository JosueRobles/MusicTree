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
  const [sortOrder, setSortOrder] = useState('predeterminado');

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

        // Asociar imágenes de álbumes a las canciones
        const cancionesConImagen = cancionesRes.data.map(cancion => {
          const album = uniqueAlbums.find(album => album.id_album === cancion.album);
          return { ...cancion, foto_album: album ? album.foto_album : '' };
        });

        setArtists(uniqueArtists);
        setAlbums(uniqueAlbums);
        setCanciones(cancionesConImagen);
        setVideos(videosRes.data);

        const combinedItems = [];
        const max = Math.max(uniqueArtists.length, uniqueAlbums.length, cancionesConImagen.length, videosRes.data.length);

        for (let i = 0; i < max; i++) {
          if (uniqueArtists[i]) combinedItems.push({ id: uniqueArtists[i].id_artista, name: uniqueArtists[i].nombre_artista, image: uniqueArtists[i].foto_artista, type: 'artist', popularidad: uniqueArtists[i].popularidad_artista });
          if (uniqueAlbums[i]) combinedItems.push({ id: uniqueAlbums[i].id_album, name: uniqueAlbums[i].titulo, image: uniqueAlbums[i].foto_album, type: 'album', popularidad: uniqueAlbums[i].popularidad_album });
          if (cancionesConImagen[i]) combinedItems.push({ id: cancionesConImagen[i].id_cancion, name: cancionesConImagen[i].titulo, image: cancionesConImagen[i].foto_album, type: 'song', popularidad: cancionesConImagen[i].popularidad });
          if (videosRes.data[i]) combinedItems.push({ id: videosRes.data[i].id_video, name: videosRes.data[i].titulo, image: videosRes.data[i].miniatura, type: 'video', popularidad: videosRes.data[i].popularidad });
        }

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
      (!filtros.genero || artista.generos.includes(filtros.genero)) &&
      (!filtros.artista || artista.id_artista === filtros.artista)
    );

    const filteredAlbumes = albums.filter(album => 
      (!filtros.termino || album.titulo.toLowerCase().includes(filtros.termino.toLowerCase())) &&
      (!filtros.anio || album.anio === parseInt(filtros.anio)) &&
      (!filtros.artista || album.artista_id === filtros.artista) &&
      (!filtros.genero || album.generos.includes(filtros.genero))
    );

    const filteredCanciones = canciones.filter(cancion => {
      const album = albums.find(album => album.id_album === cancion.album);
      return (!filtros.termino || cancion.titulo.toLowerCase().includes(filtros.termino.toLowerCase())) &&
        (!filtros.anio || album.anio === parseInt(filtros.anio)) &&
        (!filtros.artista || cancion.artistas.includes(filtros.artista)) &&
        (!filtros.genero || cancion.generos.includes(filtros.genero))
    });

    const filteredVideos = videos.filter(video => 
      (!filtros.termino || video.titulo.toLowerCase().includes(filtros.termino.toLowerCase())) &&
      (!filtros.anio || video.anio === parseInt(filtros.anio)) &&
      (!filtros.artista || video.artistas.includes(filtros.artista)) &&
      (!filtros.genero || video.generos.includes(filtros.genero))
    );

    const combinedItems = [];
    const max = Math.max(filteredArtistas.length, filteredAlbumes.length, filteredCanciones.length, filteredVideos.length);

    for (let i = 0; i < max; i++) {
      if (filteredArtistas[i]) combinedItems.push({ id: filteredArtistas[i].id_artista, name: filteredArtistas[i].nombre_artista, image: filteredArtistas[i].foto_artista, type: 'artist', popularidad: filteredArtistas[i].popularidad_artista });
      if (filteredAlbumes[i]) combinedItems.push({ id: filteredAlbumes[i].id_album, name: filteredAlbumes[i].titulo, image: filteredAlbumes[i].foto_album, type: 'album', popularidad: filteredAlbumes[i].popularidad_album });
      if (filteredCanciones[i]) combinedItems.push({ id: filteredCanciones[i].id_cancion, name: filteredCanciones[i].titulo, image: filteredCanciones[i].foto_album, type: 'song', popularidad: filteredCanciones[i].popularidad });
      if (filteredVideos[i]) combinedItems.push({ id: filteredVideos[i].id_video, name: filteredVideos[i].titulo, image: filteredVideos[i].miniatura, type: 'video', popularidad: filteredVideos[i].popularidad });
    }

    setItems(combinedItems);
  };

  const handleSortOrderChange = (order) => {
    setSortOrder(order);
    let sortedItems = [...items];

    if (order === 'predeterminado') {
      sortedItems.sort((a, b) => a.id - b.id);
    } else if (order === 'popularidad') {
      sortedItems.sort((a, b) => b.popularidad - a.popularidad);
    }

    setItems(sortedItems);
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
        onSortOrderChange={handleSortOrderChange}
      />

      <div className="entidad-contadores mb-8">
        <h3 className="text-2xl font-bold mb-4">Resumen de Contenido</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          {[
            { nombre: 'Artistas', cantidad: artists.length > 999 ? '1000+' : artists.length },
            { nombre: 'Álbumes', cantidad: albums.length > 999 ? '1000+' : albums.length },
            { nombre: 'Canciones', cantidad: canciones.length > 999 ? '1000+' : canciones.length },
            { nombre: 'Videos', cantidad: videos.length > 999 ? '1000+' : videos.length }
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