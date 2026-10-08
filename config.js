// Pon aquí tu API key de TMDB (themoviedb.org → Configuración → API)
const API_KEY = "876c1c64e0bd8a1a16f07b703751c460";

const API_BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const IMG_BIG = "https://image.tmdb.org/t/p/original";

// Qué abre el botón "Launch".
// Por defecto abre la página de TMDB que muestra en qué plataformas legales
// (Netflix, Disney+, Prime, etc.) está disponible el título.
function movieURL(id){
  return `https://www.themoviedb.org/movie/${id}/watch`;
}
function tvURL(id, season, episode){
  return `https://www.themoviedb.org/tv/${id}/season/${season}/episode/${episode}/watch`;
}
