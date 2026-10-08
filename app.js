const IMG = "https://image.tmdb.org/t/p/w500";
const IMG_BIG = "https://image.tmdb.org/t/p/original";

const search = document.getElementById("search");
const suggestions = document.getElementById("suggestions");
const results = document.getElementById("results");
const home = document.getElementById("home");

let currentID = null;
let currentType = null;

async function fetchData(path, params = {}) {
  const qs = new URLSearchParams({ language: "es-ES", ...params });
  const res = await fetch(`/api/tmdb${path}?${qs}`);
  if (!res.ok) throw new Error("Error " + res.status);
  return res.json();
}

function poster(path) {
  return path ? IMG + path : "https://via.placeholder.com/300x450/1b1b2b/888?text=Sin+imagen";
}

function slide(id, dir) {
  document.getElementById(id).scrollBy({ left: dir * 500, behavior: "smooth" });
}

/* TRENDING */
const LANG_NAMES = { ko:"Corea", zh:"China", cn:"China", ja:"Japón", th:"Tailandia", hi:"India", tr:"Turquía", es:"España" };

async function loadTrending() {
  try {
    const cfg = await (await fetch("/api/config")).json();

    const names = [...new Set(cfg.languages.map(l => LANG_NAMES[l] || l.toUpperCase()))];
    if (names.length) {
      document.getElementById("tvTitle").textContent = "Top 10 Series: " + names.join(", ");
      document.getElementById("moviesTitle").textContent = "Top 10 Películas: " + names.join(", ");
    }

    const tv = await fetchData("/trending/tv/day");
    document.getElementById("tv").innerHTML = tv.results.slice(0, 10).map((x, i) =>
      `<div class="rankCard" onclick="openDetails(${x.id},'tv')">
         <div class="rankNumber">${i + 1}</div>
         <img src="${poster(x.poster_path)}" alt="">
       </div>`).join("");

    if (cfg.showMovies) {
      const movies = await fetchData("/trending/movie/day");
      document.getElementById("movies").innerHTML = movies.results.slice(0, 10).map((x, i) =>
        `<div class="rankCard" onclick="openDetails(${x.id},'movie')">
           <div class="rankNumber">${i + 1}</div>
           <img src="${poster(x.poster_path)}" alt="">
         </div>`).join("");
    } else {
      document.getElementById("moviesTitle").style.display = "none";
      document.getElementById("moviesRow").style.display = "none";
    }
  } catch (e) {
    home.insertAdjacentHTML("afterbegin",
      `<p style="padding:20px;color:#f66">No se pudo cargar. Revisa TMDB_API_KEY en el archivo .env</p>`);
  }
}

/* SEARCH */
async function searchMulti(q) {
  const data = await fetchData("/search/multi", { query: q });
  return data.results.filter(x => x.media_type === "movie" || x.media_type === "tv");
}

let timer;
search.addEventListener("input", () => {
  clearTimeout(timer);
  const q = search.value.trim();

  if (q.length < 2) {
    suggestions.style.display = "none";
    results.innerHTML = "";
    home.style.display = "block";
    return;
  }

  timer = setTimeout(async () => {
    try {
      const filtered = await searchMulti(q);
      suggestions.innerHTML = filtered.slice(0, 6).map(x => {
        const title = x.title || x.name;
        const year = (x.release_date || x.first_air_date || "").slice(0, 4);
        const rating = x.vote_average ? x.vote_average.toFixed(1) : "N/A";
        return `<div class="suggestion" onclick="openDetails(${x.id},'${x.media_type}')">
                  <img src="${poster(x.poster_path)}" alt="">
                  <div class="suggestionInfo">
                    <div>${title}</div>
                    <div class="suggestionMeta">${year} • ⭐ ${rating}</div>
                  </div>
                </div>`;
      }).join("");
      suggestions.style.display = filtered.length ? "block" : "none";
    } catch (e) {
      suggestions.style.display = "none";
    }
  }, 300);
});

search.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  const q = search.value.trim();
  if (q.length < 2) return;
  suggestions.style.display = "none";
  const filtered = await searchMulti(q);
  home.style.display = "none";
  results.innerHTML = filtered.map(x =>
    `<div class="card" onclick="openDetails(${x.id},'${x.media_type}')">
       <img src="${poster(x.poster_path)}" alt="">
       <div class="cardTitle">${x.title || x.name}</div>
     </div>`).join("");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("header")) suggestions.style.display = "none";
});

/* DETAILS */
async function openDetails(id, type) {
  currentID = id;
  currentType = type;
  suggestions.style.display = "none";

  document.getElementById("launchOverlay").style.display = "none";
  document.getElementById("seasonSelect").innerHTML = "";
  document.getElementById("episodeSelect").innerHTML = "";

  const data = await fetchData(`/${type}/${id}`);

  document.getElementById("banner").style.backgroundImage =
    data.backdrop_path ? `url(${IMG_BIG}${data.backdrop_path})` : "none";

  document.getElementById("title").textContent = data.title || data.name;
  document.getElementById("overview").textContent = data.overview || "Sin descripción.";
  document.getElementById("rating").textContent = "⭐ " + (data.vote_average ? data.vote_average.toFixed(1) : "N/A");
  document.getElementById("genres").textContent = (data.genres || []).map(g => g.name).join(", ");

  document.getElementById("details").style.display = "block";
  document.getElementById("details").scrollTop = 0;

  loadCast(id, type);
  if (type === "tv") loadSeasons(data.seasons);
}

/* CAST */
async function loadCast(id, type) {
  const data = await fetchData(`/${type}/${id}/credits`);
  document.getElementById("cast").innerHTML = data.cast.slice(0, 12).map(actor =>
    `<div class="castCard">
       <img src="${poster(actor.profile_path)}" alt="">
       <div>${actor.name}</div>
     </div>`).join("");
}

/* TV SEASONS */
function loadSeasons(seasons) {
  document.getElementById("seasonSelect").innerHTML = seasons
    .filter(s => s.season_number !== 0)
    .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`)
    .join("");
  loadEpisodes();
}

async function loadEpisodes() {
  const season = document.getElementById("seasonSelect").value;
  const ep = document.getElementById("episodeSelect");
  ep.innerHTML = "";
  if (!season) return;

  const data = await fetchData(`/tv/${currentID}/season/${season}`);
  ep.innerHTML = data.episodes
    .map(e => `<option value="${e.episode_number}">Episode ${e.episode_number}</option>`)
    .join("");
}

document.getElementById("seasonSelect").addEventListener("change", loadEpisodes);

/* PLAYER */
async function play(type, id, season, episode) {
  const qs = new URLSearchParams({ type, id, season: season || 1, episode: episode || 1 });
  let src;
  try {
    const res = await fetch(`/api/source?${qs}`);
    src = await res.json();
    if (!res.ok) throw new Error(src.error);
  } catch (e) {
    alert("No se pudo obtener la fuente: " + e.message);
    return;
  }

  const box = document.getElementById("playerBox");
  box.innerHTML = "";

  if (src.mode === "iframe") {
    box.innerHTML = `<iframe src="${src.url}" allowfullscreen allow="autoplay; fullscreen"></iframe>`;
  } else {
    const v = document.createElement("video");
    v.controls = true;
    v.autoplay = true;
    box.appendChild(v);

    if (src.url.includes(".m3u8") && window.Hls && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src.url);
      hls.attachMedia(v);
    } else {
      v.src = src.url;
    }
  }
  document.getElementById("player").style.display = "block";
}

document.getElementById("closePlayer").onclick = () => {
  document.getElementById("playerBox").innerHTML = "";
  document.getElementById("player").style.display = "none";
};

document.getElementById("launchBtn").onclick = () => {
  if (currentType === "movie") {
    play("movie", currentID);
  } else {
    const o = document.getElementById("launchOverlay");
    o.style.display = o.style.display === "block" ? "none" : "block";
  }
};

document.getElementById("confirmLaunch").onclick = () => {
  document.getElementById("launchOverlay").style.display = "none";
  play("tv", currentID,
    document.getElementById("seasonSelect").value,
    document.getElementById("episodeSelect").value);
};

/* CLOSE */
document.getElementById("backBtn").onclick = () => {
  document.getElementById("details").style.display = "none";
};

/* INIT */
loadTrending();
