const API_URL_uni = "http://localhost:3000/universities";

window.universitiesCache = null;
window.universitiesLoadError = null;

async function preloadUniversities() {
  try {
    const res = await fetch(API_URL_uni, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    window.universitiesCache = await res.json();
    window.universitiesLoadError = null;
    console.log("universities preloaded:", window.universitiesCache.length);
  } catch (err) {
    window.universitiesCache = [];
    window.universitiesLoadError = err;
    console.warn("Не удалось загрузить universities:", err);
  }
}
preloadUniversities(); 

if (typeof L === "undefined") {
  console.error("Leaflet не найден. Подключи leaflet.js перед этим скриптом.");
} else {

  window.map = L.map('map', { zoomControl: true });

  window.map.setMinZoom(4);
  window.map.setMaxZoom(10);

  window.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 12
  }).addTo(window.map);

  const info = document.getElementById('info');

  function getRegionName(props) {
    return props && (props.NAME || props.Name || props.NAME_1 || props.name || props.region || props.city) || "Неизвестная область";
  }

  function style(feature) {
    return {
      weight: 1,
      color: '#8a94a3',
      fillColor: '#e5e9ef',
      fillOpacity: 0.9
    };
  }

  let geojsonLayer = null;

  function refreshMapDebounced(wait = 60) {
    if (refreshMapDebounced._t) clearTimeout(refreshMapDebounced._t);
    refreshMapDebounced._t = setTimeout(() => {
      try {
        if (window.map && typeof window.map.invalidateSize === 'function') window.map.invalidateSize();
        if (window.tileLayer && typeof window.tileLayer.redraw === 'function') window.tileLayer.redraw();
      } catch (err) {
        console.warn('refreshMap error', err);
      }
    }, wait);
  }

  function highlight(e) {
    const layer = e.target;
    layer.setStyle({ weight: 2, color: '#1e7bff', fillColor: '#cfe4ff', fillOpacity: 1 });

    const props = layer.feature.properties;
    const regionName = getRegionName(props);

    if (window.universitiesCache === null && window.universitiesLoadError === null) {
      info.innerHTML = `${regionName}<br>Загрузка...`; return;
    }
    if (window.universitiesLoadError) {
      info.innerHTML = `${regionName}<br>Данные недоступны`; return;
    }
    const uniCounter = (window.universitiesCache || []).filter(u => (u.region || u.city) === regionName).length;
    info.innerHTML = `${regionName}<br>${uniCounter} универс${uniCounter === 1 ? 'итет' : 'итета'}`;
  }

  function reset(e) {
    if (geojsonLayer) geojsonLayer.resetStyle(e.target);
    info.textContent = "Наведите на область…";
  }

  async function clickAndCrDiv(e) {
    const layer = e.target;
    const props = layer.feature.properties;
    const regionName = getRegionName(props);
    const listOfUni = document.getElementById("listSecti");
    if (!listOfUni) return;
    listOfUni.innerHTML = "";

    if (window.universitiesCache === null && window.universitiesLoadError === null) {
      listOfUni.innerHTML = `<div class="uni-loading">Загрузка...</div>`;
      await preloadUniversities();
    }
    if (window.universitiesLoadError) {
      listOfUni.innerHTML = `<div class="uni-error">Данные временно недоступны.</div>`; return;
    }

    const matches = (window.universitiesCache || []).filter(u => (u.region || u.city) === regionName);
    if (!matches.length) { listOfUni.innerHTML = `<div class="uni-empty">Университеты не найдены в регионе ${regionName}.</div>`; return; }

    let html = '';
    matches.forEach(d => {
      const photo = d.urlphoto || 'https://via.placeholder.com/140x100?text=No+Image';
      const place = d.region || d.city || '';
      html += `
        <button onclick="redir('${encodeURIComponent(d.name || '')}')" class="uni-btn" style="border:none;background:none;padding:0;margin:6px 0;width:100%;text-align:left;">
          <div class="uni-item">
            <div class="uni-text">
              <div class="uni-city">${place}</div>
              <div class="uni-name">${d.name || 'Без названия'}</div>
            </div>
            <img class="uni-img" src="${photo}" alt="${d.name || ''}">
          </div>
        </button>
      `;
    });
    listOfUni.innerHTML = html;
  }

 
  function redir(encodedName) { const name = decodeURIComponent(encodedName || ''); window.location.href = "uni-info.html?name=" + encodeURIComponent(name); }
  window.redir = redir;

  function zoomToFeature(e) { window.map.fitBounds(e.target.getBounds()); }

  function onEachFeature(feature, layer) {
    layer.on({ mouseover: highlight, mouseout: reset, click: clickAndCrDiv, dblclick: zoomToFeature });
  }

 
  const GEOJSON_URL = "https://raw.githubusercontent.com/artemnovichkov/KazakhstanMapExample/main/KazakhstanMapExample/kazakhstan.geojson";
  fetch(GEOJSON_URL)
    .then(res => res.json())
    .then(data => {
      geojsonLayer = L.geoJSON(data, { style: style, onEachFeature: onEachFeature, pointToLayer: () => null }).addTo(window.map);

      
      window.map.eachLayer(layer => { if (layer instanceof L.Marker) window.map.removeLayer(layer); });

      window.map.fitBounds(geojsonLayer.getBounds(), { padding: [20, 20] });
      setTimeout(() => refreshMapDebounced(20), 60);
    })
    .catch(err => console.error("Ошибка загрузки geojson:", err));

  
  window.addEventListener('resize', () => refreshMapDebounced(120));
  window.addEventListener('orientationchange', () => refreshMapDebounced(200));
  const parent = document.querySelector('.map-and-list') || document.querySelector('.map-container') || document.body;
  if (parent && typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(() => refreshMapDebounced(80)); ro.observe(parent); }
  const mapEl = document.getElementById('map');
  if (mapEl) {
    const mo = new MutationObserver(muts => { muts.forEach(m => { if (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class')) { const cs = window.getComputedStyle(mapEl); if (cs.display !== 'none' && cs.visibility !== 'hidden' && mapEl.offsetHeight > 0) refreshMapDebounced(40); } }); });
    mo.observe(mapEl, { attributes: true, attributeFilter: ['style', 'class'] });
  }
  window.addEventListener('load', () => setTimeout(() => refreshMapDebounced(40), 200));

  window._refreshMapNow = () => refreshMapDebounced(0);
}
