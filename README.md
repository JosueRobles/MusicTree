# MusicTree

## Proyecto Modular
- **Gestión de la Tecnología de Información**
- **Sistemas Robustos, Paralelos y Distribuidos**
- **Cómputo Flexible (softcomputing)**

## Integrantes del Proyecto
- **Josue Daniel Robles Mercado**
  - Matrícula: 218025205
  - Carrera: INNI
  - Email: josue.robles0252@alumnos.udg.mx
- **Dulce Maria Chavarin Gomez**
  - Matrícula: 218128993
  - Carrera: INNI
  - Email: dulce.chavarin@alumnos.udg.mx

## Asesor del Proyecto
- **Juan Jose Lopez Cisneros**
  - ID: 2307022
  - Departamento: Ciencias Computacionales
  - Email: juan.lopez@academicos.udg.mx

## Resumen del Proyecto
### Objetivo general
Desarrollar una plataforma interactiva para la evaluación y clasificación de música que permita a los usuarios calificar, analizar y compartir su experiencia musical mediante funcionalidades innovadoras y dinámicas.

### Objetivos específicos
- Establecer un sistema de favoritos y ranking personalizado que influya en los rankings generales.
- Implementar un historial de valoraciones con posibilidad de actualización dentro de un intervalo determinado.
- Crear un resumen anual personalizado con las canciones y artistas mejor valorados por el usuario.
- Implementar un sistema de valoración de videos musicales y presentaciones en vivo basado en interacciones del usuario.
- Desarrollar un sistema de afinidad musical que conecte a usuarios con gustos similares mediante un algoritmo de recomendación.
- Diseñar una funcionalidad de tier lists para clasificar y comparar música de manera personalizada.
- Optimizar la experiencia de usuario mediante una interfaz intuitiva y eficiente, asegurando accesibilidad y facilidad de navegación.
- Implementar un sistema de almacenamiento y gestión de datos eficiente para manejar la información de valoraciones y preferencias de los usuarios.

### Justificación
MusicTree busca ofrecer una plataforma innovadora que fomente la interacción entre los amantes de la música, proporcionando herramientas que permitan expresar sus opiniones y descubrir nueva música con base en sus preferencias y las de la comunidad.

### Impacto social
MusicTree fomenta la creación de una comunidad musical interactiva en la que los usuarios pueden descubrir, compartir y debatir sobre sus preferencias sin depender exclusivamente de algoritmos de recomendación. Esto no solo enriquece la experiencia del usuario, sino que también ayuda a la industria musical a comprender mejor las tendencias y opiniones del público. Además, puede tener un impacto positivo en la diversidad cultural, impulsando la visibilidad de artistas emergentes mediante rankings y recomendaciones orgánicas.

### Hipótesis
Si se desarrolla una plataforma de valoración musical con funciones sociales avanzadas, entonces los usuarios tendrán una mejor experiencia al descubrir música y conectarse con otros, aumentando la interacción dentro de la comunidad musical.

## Metodología propuesta
- **Lenguajes de programación:** JavaScript, Python
- **Frameworks:** React.js, Node.js
- **Base de datos:** PostgreSQL (relacional), Firebase (NoSQL)
- **Infraestructura en la nube:** AWS / Firebase
- **Metodología de desarrollo:** Scrum
- **Seguridad y buenas prácticas:** OWASP, GDPR Compliance

## Módulo 2: Gestión de las tecnologías de la información
- **SCRUM:** (X)
- **Cloud computing:** (X)
- **Big Data:** ( )
- **IoT:** ( )

### Sistemas operativos
- **Linux:** ( )
- **Windows:** (X)
- **Multiplaforma:** ( )

### Bases de datos locales y distribuidas
- **Bases de datos relacionales:** (X)
- **Bases NoSQL:** ( )
  - **SGDB:** PostgreSQL

### Otras herramientas
- **Node.js**
- **React**

## Módulo 3: Sistemas Robustos, Paralelos y Distribuidos
- **Servicios distribuidos en la nube:** (X)
- **Hilos (App, SO, HW):** ( )
- **Cliente-servidor:** (X)

### Programación paralela
- **Programación paralela:** (X)

### Interacción humano-computadora
- **Páginas web dinámicas:** (X)

### Otras herramientas
- **AWS**
- **Docker**
- **WebSockets**

## Módulo 4: Cómputo Flexible (softcomputing)
### Técnicas de cómputo flexible
- **Minería de datos:** (X)

### Algoritmos
- **Árboles de decisión:** (X)
- **K-means:** (X)
- **PCA:** (X)

### Aprendizaje de máquina e IA
- **Convolutional Neural Networks:** (X)
- **Long Short Term Memory Neural Networks:** (X)

### Otras herramientas
- **TensorFlow**
- **Scikit-learn**
- **Pandas**
- **NumPy**

## Cronograma de actividades
1. Investigación y planificación
2. Diseño de interfaz de usuario (UX/UI)
3. Desarrollo de backend y funcionalidades
4. Pruebas de usabilidad
5. Pruebas de rendimiento y optimización
6. Pruebas finales
7. Revisión y ajustes finales (14 de marzo)
8. Lanzamiento de la aplicación

## Estructura y Funcionalidades de MusicTree
1. **Página Principal (`musictree/`)**
   - Encabezado:
     - Banner con el logo (redirige a la página de inicio `/`).
     - Barra de búsqueda.
     - Secciones del menú: Música, Miembros, Listas, Insignias, Acerca de.
     - Botones de Iniciar sesión y Registrarse.
   - Contenido:
     - Introducción a MusicTree.
     - Tendencias de la semana (Top 10):
       - Artistas, Álbumes, Canciones, Reseñas y Listas más populares.
     - Explicación visual de las funcionalidades clave de MusicTree con imágenes.
     - Botón destacado: Crea tu cuenta ahora.
   - Pie de página:
     - Secciones:
       - MusicTree: Inicio, Acerca de, Contribuir.
       - Legal: Términos de uso, Política de privacidad, Normas de la comunidad.
     - Derechos de autor: 2025 CUCEI. Todos los derechos reservados.

2. **Sección de Música (`musictree/music`)**
   - Encabezado y Pie de Página (idénticos a la página principal).
   - Filtros de búsqueda avanzados:
     - Año de lanzamiento.
     - Ordenar por:
       - Popularidad (Esta semana, Este mes, Este año, Siempre).
       - Mejor valoradas.
       - Nuevos lanzamientos.
       - Rankings: Top 250 Álbumes, Top 250 Artistas, Top 250 Canciones.
       - Más populares (Álbumes, Artistas, Canciones).
     - Géneros musicales.
     - Campo de búsqueda dinámica (filtro por texto en tiempo real).
   - Sección de tendencias de la semana (Top 50) con carrusel de 10 en 10:
     - Artistas, Álbumes, Canciones, Reseñas, Listas y Miembros más populares.

3. **Sección de Miembros (`musictree/members`)**
   - Encabezado y Pie de Página.
   - Llamado a la acción: "¡Conéctate con otros amantes de la música!" + botón de Registrarse.
   - Rankings de usuarios:
     - Miembros más populares de la semana.
     - Usuarios con más seguidores.
     - Usuarios con más exploración (con medidas anti-bots: mínimo 2 minutos por canción, 20 minutos por álbum y 1 hora por artista).
   - Cada perfil en el ranking incluye:
     - Foto de perfil.
     - Nombre de usuario y nombre real/apodo.
     - Insignia elegida.
     - Botón Seguir.

4. **Sección de Listas (`musictree/lists`)**
   - Encabezado y Pie de Página.
   - Contenido:
     - Botón para crear listas personalizadas.
     - Tendencias de la semana (Top N dinámico):
       - Se muestran las listas más populares con:
         - Usuario que la subió.
         - Título y parte de la descripción.
         - % de canciones o álbumes valorados dentro de la lista.

5. **Sección de Insignias (`musictree/badges`)**
   - Encabezado y Pie de Página.
   - Funcionalidad:
     - Sistema de logros inspirado en trofeos de PlayStation.
     - Insignias que los usuarios pueden desbloquear y mostrar en su perfil.
     - Ejemplo: "Amante del Rock" (valora 100 canciones del género Rock).

6. **Página de Información (`musictree/about`)**
   - Encabezado y Pie de Página.
   - Contenido:
     - Explicación detallada sobre MusicTree.
     - Misión, visión y objetivos.
     - Diferencias con otras plataformas similares.

7. **Páginas de Autenticación (`musictree/login` y `musictree/register`)**
   - Formularios para iniciar sesión o registrarse.

## Más Características Principales
- **Exploración Musical:** Los usuarios pueden descubrir artistas, álbumes y canciones, con información detallada y valoraciones de la comunidad.
- **Valoraciones:** Sistema de puntuación con estrellas verdes (incluyendo medias estrellas y la opción de calificar con 0 o hasta 5).
- **Listas Personalizadas:** artistas/álbumes/canciones (no combinar tipos).
- **Feed Interactivo:** Publicaciones de tendencias con reseñas, listas y actualizaciones de amigos.
- **Seguimiento y Notificaciones:** Seguimiento de usuarios y artistas, con alertas de nuevos lanzamientos.
- **Tier Lists Dinámicas:** Rankings comunitarios donde los usuarios votan en tiempo real.
- **Inicio de Sesión y Roles:** Sistema de autenticación para usuarios regulares y administradores.
- **Panel de Administración:** Herramientas para la moderación y gestión del contenido.
- **Base de Datos Principal:** completamente sincronizado con Supabase.
- **Configuración personalizada:** modificar criterios de recomendación.
- **Tolerancia a errores tipográficos** en la barra de búsqueda (ejemplo luis mikel -> Luis Miguel).
- **Autocompletado en la búsqueda.**
- **Paginación o carga infinita en listas largas.**
- **Personalización de perfil según insignias.**
- **Integración con Spotify/Apple/YouTube Music.**
- **Relación de artistas similares.**
- **Gráficas de valoración.**
- **Pop-ups de logros desbloqueados** (similar al de PlayStation con sonido).