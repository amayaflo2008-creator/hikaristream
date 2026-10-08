require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const {
  TMDB_API_KEY,
  PLAYER_MODE = "video",
  MOVIE_SOURCE = "",
  TV_SOURCE = ""
} = process.env;

// Filtros de contenido (se cambian en .env)
const LANGS = (process.env.ORIGIN_LANGUAGES || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
if (LANGS.includes("zh") && !LANGS.includes("cn")) LANGS.push("cn"); // cantonés
const SHOW_MOVIES = (process.env.SHOW_MOVIES || "true").toLowerCase() !== "false";

if (!TMDB_API_KEY) {
  console.error("Falta TMDB_API_KEY en el archivo .env");
  process.exit(1);
}

app.use(express.static(path.join(__dirname, "public")));

// Configuración visible para el frontend
app.get("/api/config", (req, res) => {
  res.json({ languages: LANGS, showMovies: SHOW_MOVIES });
});

// Proxy hacia TMDB (la API key nunca llega al navegador)
const ALLOWED = /^\/(trending|search|movie|tv|discover)\//;

app.get("/api/tmdb/*", async (req, res) => {
  let p = "/" + req.params[0];
  if (!ALLOWED.test(p)) {
    return res.status(400).json({ error: "Ruta no permitida" });
  }
  const params = { ...req.query };

  // Si hay idiomas elegidos, el "top" pasa a ser un discover filtrado
  if (LANGS.length && (p === "/trending/tv/day" || p === "/trending/movie/day")) {
    p = p === "/trending/tv/day" ? "/discover/tv" : "/discover/movie";
    Object.assign(params, {
      with_original_language: LANGS.join("|"),
      sort_by: "popularity.desc",
      "vote_count.gte": "20"
    });
  }

  const qs = new URLSearchParams({ ...params, api_key: TMDB_API_KEY });
  try {
    const r = await fetch(`https://api.themoviedb.org/3${p}?${qs}`);
    const json = await r.json();

    // Filtrar resultados del buscador
    if (p === "/search/multi" && Array.isArray(json.results)) {
      json.results = json.results.filter(x => {
        if (x.media_type === "movie" && !SHOW_MOVIES) return false;
        if (x.media_type !== "movie" && x.media_type !== "tv") return false;
        if (LANGS.length && !LANGS.includes(x.original_language)) return false;
        return true;
      });
    }
    res.status(r.status).json(json);
  } catch (e) {
    res.status(502).json({ error: "No se pudo contactar con TMDB" });
  }
});

// Devuelve la URL de reproducción según las plantillas del .env
app.get("/api/source", (req, res) => {
  const { type, id, season = "1", episode = "1" } = req.query;
  const isNum = v => /^\d+$/.test(String(v));

  if (!["movie", "tv"].includes(type) || ![id, season, episode].every(isNum)) {
    return res.status(400).json({ error: "Parámetros inválidos" });
  }

  const template = type === "movie" ? MOVIE_SOURCE : TV_SOURCE;
  if (!template) {
    return res.status(404).json({ error: "No hay fuente configurada en .env" });
  }

  const url = template
    .replace(/\{id\}/g, id)
    .replace(/\{season\}/g, season)
    .replace(/\{episode\}/g, episode);

  res.json({ mode: PLAYER_MODE, url });
});

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
  console.log(`Idiomas: ${LANGS.length ? LANGS.join(", ") : "todos"} | Películas: ${SHOW_MOVIES ? "sí" : "no"}`);
});
