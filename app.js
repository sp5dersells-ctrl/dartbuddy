/* ============================================================
   DartBuddy — app.js  (v2 — dashboard upgrade)
   All API logic, helpers, and locations are unchanged.
   Only renderConditions + loading/error states are upgraded.
   ============================================================ */

/* --- Preset Locations --- */
const LOCATIONS = [
  {
    id:   'dartmouth',
    name: 'Dartmouth',
    lat:  50.3524,
    lon:  -3.5779,
    tide: 'https://easytide.admiralty.co.uk/Home?PortID=0042C'
  },
  {
    id:   'kingswear',
    name: 'Kingswear',
    lat:  50.3491,
    lon:  -3.5701,
    tide: 'https://easytide.admiralty.co.uk/Home?PortID=0042C'
  },
  {
    id:   'dittisham',
    name: 'Dittisham',
    lat:  50.3700,
    lon:  -3.5960,
    tide: 'https://easytide.admiralty.co.uk/Home?PortID=0042C'
  },
  {
    id:   'stoke-gabriel',
    name: 'Stoke Gabriel',
    lat:  50.4002,
    lon:  -3.6241,
    tide: 'https://easytide.admiralty.co.uk/Home?PortID=0042C'
  },
  {
    id:   'totnes',
    name: 'Totnes',
    lat:  50.4318,
    lon:  -3.6853,
    tide: 'https://easytide.admiralty.co.uk/Home?PortID=0042C'
  }
];

/* --- WMO Weather Code Descriptions --- */
const WMO_CODES = {
  0:  { label: 'Clear sky',              icon: '' },
  1:  { label: 'Mainly clear',           icon: '' },
  2:  { label: 'Partly cloudy',          icon: '' },
  3:  { label: 'Overcast',               icon: '' },
  45: { label: 'Fog',                    icon: '' },
  48: { label: 'Depositing rime fog',    icon: '' },
  51: { label: 'Light drizzle',          icon: '' },
  53: { label: 'Moderate drizzle',       icon: '' },
  55: { label: 'Dense drizzle',          icon: '' },
  61: { label: 'Slight rain',            icon: '' },
  63: { label: 'Moderate rain',          icon: '' },
  65: { label: 'Heavy rain',             icon: '' },
  71: { label: 'Slight snow',            icon: '' },
  73: { label: 'Moderate snow',          icon: '' },
  75: { label: 'Heavy snow',             icon: '' },
  77: { label: 'Snow grains',            icon: '' },
  80: { label: 'Slight showers',         icon: '' },
  81: { label: 'Moderate showers',       icon: '' },
  82: { label: 'Violent showers',        icon: '' },
  85: { label: 'Slight snow showers',    icon: '' },
  86: { label: 'Heavy snow showers',     icon: '' },
  95: { label: 'Thunderstorm',           icon: '' },
  96: { label: 'Thunderstorm w/ hail',   icon: '' },
  99: { label: 'Thunderstorm w/ hail',   icon: '' }
};

/* --- Wind Direction Helpers --- */
function degreesToBearing(deg) {
  if (deg === null || deg === undefined) return 'N/A';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[idx];
}

/* --- Format helper --- */
function fmt(val, decimals) {
  if (val === null || val === undefined || isNaN(val)) return null;
  return parseFloat(val).toFixed(decimals !== undefined ? decimals : 1);
}

/* --- Day name helper --- */
function dayName(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'short' });
}

/* --- Current time string --- */
function nowString() {
  return new Date().toLocaleString('en-GB', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  });
}

function timeString() {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit'
  });
}

function cacheKey(locId) {
  return `dartbuddy-cache-${locId}`;
}

function saveCache(locId, weather, marine) {
  try {
    localStorage.setItem(cacheKey(locId), JSON.stringify({ savedAt: Date.now(), weather, marine }));
  } catch (_) {}
}

function loadCache(locId) {
  try {
    const raw = localStorage.getItem(cacheKey(locId));
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/* --- SVG compass rose for wind direction --- */
function compassSVG(deg) {
  const d = (deg !== null && deg !== undefined) ? deg : 0;
  return `<svg class="wind-compass" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- outer ring -->
    <circle cx="40" cy="40" r="36" fill="none" stroke="var(--slate)" stroke-width="1"/>
    <!-- tick marks at 45° intervals -->
    <line x1="40" y1="7" x2="40" y2="13" stroke="var(--steel)" stroke-width="1"/>
    <line x1="40" y1="67" x2="40" y2="73" stroke="var(--steel)" stroke-width="1"/>
    <line x1="7" y1="40" x2="13" y2="40" stroke="var(--steel)" stroke-width="1"/>
    <line x1="67" y1="40" x2="73" y2="40" stroke="var(--steel)" stroke-width="1"/>
    <!-- cardinal labels -->
    <text x="40" y="5.5" text-anchor="middle" font-size="6.5" fill="var(--mist)" font-family="DM Sans, sans-serif" font-weight="600">N</text>
    <text x="40" y="78" text-anchor="middle" font-size="6.5" fill="var(--mist)" font-family="DM Sans, sans-serif" font-weight="600">S</text>
    <text x="3.5" y="42.5" text-anchor="middle" font-size="6.5" fill="var(--mist)" font-family="DM Sans, sans-serif" font-weight="600">W</text>
    <text x="76.5" y="42.5" text-anchor="middle" font-size="6.5" fill="var(--mist)" font-family="DM Sans, sans-serif" font-weight="600">E</text>
    <!-- needle: rotated by wind direction; amber tip points toward wind source (FROM direction) -->
    <g transform="rotate(${d}, 40, 40)">
      <polygon points="40,14 37,40 40,36 43,40" fill="var(--amber-light)" opacity="0.95"/>
      <polygon points="40,66 37,40 40,44 43,40" fill="var(--steel)" opacity="0.7"/>
    </g>
    <!-- center dot -->
    <circle cx="40" cy="40" r="2.5" fill="var(--off-white)"/>
  </svg>`;
}

/* --- Skeleton loading state --- */
function skeletonHTML(locName) {
  return `<div class="fade-in">
    <div class="dash-meta">
      <div class="condition-pill" style="background:var(--navy-card);">
        <span class="skel" style="width:14px;height:14px;border-radius:50%;display:inline-block;"></span>
        <span class="skel skel--inline" style="width:80px;"></span>
      </div>
      <span class="skel skel--inline" style="width:130px;"></span>
    </div>
    <div class="dash-grid">
      <div class="dash-card">
        <div class="skel skel--label"></div>
        <div class="skel skel--big"></div>
        <div class="skel skel--text"></div>
      </div>
      <div class="dash-card dash-card--wind">
        <div class="skel skel--label"></div>
        <div style="display:flex;gap:20px;align-items:center;">
          <div class="skel skel--compass"></div>
          <div style="flex:1;">
            <div class="skel skel--big" style="margin-bottom:12px;"></div>
            <div class="skel skel--text"></div>
          </div>
        </div>
      </div>
      <div class="dash-card">
        <div class="skel skel--label"></div>
        <div class="skel skel--big"></div>
        <div class="skel skel--text"></div>
      </div>
    </div>
    <div class="dash-marine">
      <div class="dash-card">
        <div class="skel skel--label"></div>
        <div class="marine-grid">
          <div class="marine-stat"><div class="skel" style="height:10px;width:60px;margin-bottom:10px;"></div><div class="skel" style="height:32px;width:60px;"></div></div>
          <div class="marine-stat"><div class="skel" style="height:10px;width:60px;margin-bottom:10px;"></div><div class="skel" style="height:32px;width:60px;"></div></div>
          <div class="marine-stat"><div class="skel" style="height:10px;width:60px;margin-bottom:10px;"></div><div class="skel" style="height:32px;width:60px;"></div></div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   MAIN: Initialise conditions page
   ============================================================ */

let currentLocation = null;
let refreshIntervalId = null;
let activeRequestId = 0;

function startAutoRefresh() {
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  refreshIntervalId = window.setInterval(() => {
    if (currentLocation) {
      loadConditions(currentLocation, document.getElementById('conditionsContent'), { silent: true, showLoading: false });
    }
  }, 5 * 60 * 1000);
}

function initConditionsPage() {
  const tabsEl    = document.getElementById('locationTabs');
  const contentEl = document.getElementById('conditionsContent');

  if (!tabsEl || !contentEl) return; // not on conditions page

  const requestedId = new URLSearchParams(window.location.search).get('loc');
  let activeLocation = LOCATIONS.find(loc => loc.id === requestedId) || LOCATIONS[0];

  /* Build location tabs */
  LOCATIONS.forEach((loc, i) => {
    const btn = document.createElement('button');
    btn.className = 'location-tab' + (loc.id === activeLocation.id ? ' active' : '');
    btn.textContent = loc.name;
    btn.setAttribute('data-id', loc.id);
    btn.addEventListener('click', () => {
      tabsEl.querySelectorAll('.location-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      activeLocation = loc;
      currentLocation = loc;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('loc', loc.id);
      history.replaceState({}, '', nextUrl);
      loadConditions(loc, contentEl);
    });
    tabsEl.appendChild(btn);
  });

  currentLocation = activeLocation;

  contentEl.addEventListener('click', (event) => {
    const refreshBtn = event.target.closest('[data-refresh-conditions]');
    if (refreshBtn && currentLocation) {
      loadConditions(currentLocation, contentEl, { forceFresh: true });
    }
  });

  /* Load first location */
  loadConditions(activeLocation, contentEl);
  startAutoRefresh();
}

/* ============================================================
   LOAD CONDITIONS
   ============================================================ */
async function loadConditions(loc, container, options = {}) {
  const { silent = false, showLoading = true, forceFresh = false } = options;
  activeRequestId += 1;
  const requestId = activeRequestId;
  currentLocation = loc;
  window._dartCurrentLoc = loc;

  if (showLoading) {
    container.innerHTML = skeletonHTML(loc.name);
  }

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${loc.lat}&longitude=${loc.lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max,precipitation_sum` +
    `&wind_speed_unit=knots&forecast_days=7&timezone=Europe%2FLondon`;

  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?` +
    `latitude=${loc.lat}&longitude=${loc.lon}` +
    `&current=wave_height,wave_period,wave_direction,wind_wave_height` +
    `&timezone=Europe%2FLondon`;

  try {
    const weatherResp = await fetch(weatherUrl, { cache: 'no-store' });
    if (!weatherResp.ok) throw new Error('Weather data unavailable right now.');
    const weather = await weatherResp.json();

    let marine = null;
    try {
      const marineResp = await fetch(marineUrl, { cache: 'no-store' });
      if (marineResp.ok) {
        marine = await marineResp.json();
      }
    } catch (_) {
      marine = null;
    }

    if (requestId !== activeRequestId) return;
    saveCache(loc.id, weather, marine);
    renderConditions(loc, weather, marine, container, { stale: false, silent });
  } catch (err) {
    const cached = !forceFresh ? loadCache(loc.id) : null;
    if (cached && cached.weather) {
      if (requestId !== activeRequestId) return;
      renderConditions(loc, cached.weather, cached.marine || null, container, {
        stale: true,
        cachedAt: cached.savedAt,
        silent
      });
      return;
    }

    if (requestId !== activeRequestId) return;
    container.innerHTML = `
      <div class="state-error fade-in">
        <div class="state-error__icon">!</div>
        <p class="state-error__title">Unable to load live conditions</p>
        <p class="state-error__msg">${err.message || 'Please check your connection and try again.'}</p>
        <button class="btn btn--outline" style="margin-top:8px;" data-refresh-conditions>
          Try again
        </button>
      </div>`;
  }
}

/* ============================================================
   RENDER CONDITIONS — Dashboard layout
   ============================================================ */
function renderConditions(loc, weather, marine, container, meta = {}) {
  const c = weather.current;
  const d = weather.daily;
  const m = marine && marine.current ? marine.current : null;

  const wmo    = WMO_CODES[c.weather_code] || { label: 'Unknown', icon: '' };
  const temp   = fmt(c.temperature_2m, 1);
  const feels  = fmt(c.apparent_temperature, 1);
  const wSpeed = fmt(c.wind_speed_10m, 0);
  const wGust  = fmt(c.wind_gusts_10m, 0);
  const wDir   = c.wind_direction_10m;
  const bearing = degreesToBearing(wDir);
  const precip  = fmt(c.precipitation, 1);

  const waveH   = m ? fmt(m.wave_height,  1) : null;
  const wavePer = m ? fmt(m.wave_period,  0) : null;
  const waveDir = m ? degreesToBearing(m.wave_direction) : null;

  let html = `<div class="fade-in">`;

  const freshnessClass = meta.stale ? ' is-stale' : '';
  const freshnessText = meta.stale
    ? `Saved snapshot · ${new Date(meta.cachedAt || Date.now()).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    : `Live · Updated ${timeString()}`;

  /* ── Meta bar ── */
  html += `
    <div class="dash-meta">
      <div class="condition-pill${freshnessClass}">
        <span class="condition-pill__icon" aria-hidden="true"></span>
        <span>${wmo.label} · ${loc.name}</span>
      </div>
      <div class="dash-meta__actions">
        <span class="dash-updated${freshnessClass}">${freshnessText}</span>
        <button class="mini-refresh" type="button" data-refresh-conditions>Refresh now</button>
      </div>
    </div>`;

  /* ── Primary grid: Temperature | Wind | Precipitation ── */
  html += `<div class="dash-grid">`;

  /* Temperature card */
  html += `
    <div class="dash-card dash-card--temp">
      <span class="dash-card__label">Temperature</span>
      <span class="dash-card__big">${temp !== null ? temp : '—'}<span class="dash-card__unit">°C</span></span>
      ${feels !== null ? `<span class="dash-card__secondary">Feels like ${feels}°C</span>` : ''}
    </div>`;

  /* Wind card */
  html += `
    <div class="dash-card dash-card--wind">
      <span class="dash-card__label">Wind</span>
      <div class="wind-body">
        ${compassSVG(wDir)}
        <div class="wind-stats">
          <div class="wind-row">
            <span class="wind-val">${wSpeed !== null ? wSpeed : '—'}</span>
            <span class="wind-unit">kn</span>
            <span class="wind-desc">Speed</span>
          </div>
          ${wGust !== null ? `
          <div class="wind-row wind-row--gusts">
            <span class="wind-val">${wGust}</span>
            <span class="wind-unit">kn</span>
            <span class="wind-desc">Gusts</span>
          </div>` : ''}
          <div class="wind-bearing">${bearing}${wDir !== null && wDir !== undefined ? ' · ' + wDir + '°' : ''}</div>
        </div>
      </div>
    </div>`;

  /* Precipitation card */
  html += `
    <div class="dash-card">
      <span class="dash-card__label">Precipitation</span>
      <span class="dash-card__big">${precip !== null ? precip : '0.0'}<span class="dash-card__unit">mm</span></span>
      <span class="dash-card__secondary">Current hour</span>
    </div>`;

  html += `</div>`; /* end dash-grid */

  /* ── Marine card ── */
  const marineAvailable = waveH !== null || wavePer !== null || waveDir !== null;
  html += `<div class="dash-marine">`;
  html += `<div class="dash-card">`;
  html += `<span class="dash-card__label">Marine Conditions</span>`;
  html += `<div class="marine-grid">`;

  /* Wave height */
  html += `<div class="marine-stat">
    <span class="marine-stat__label">Wave Height</span>
    ${waveH !== null
      ? `<span class="marine-stat__val">${waveH}<span class="marine-stat__unit">m</span></span>`
      : `<span class="marine-stat__na">River — N/A</span>`
    }
  </div>`;

  /* Wave period */
  html += `<div class="marine-stat">
    <span class="marine-stat__label">Wave Period</span>
    ${wavePer !== null
      ? `<span class="marine-stat__val">${wavePer}<span class="marine-stat__unit">s</span></span>`
      : `<span class="marine-stat__na">River — N/A</span>`
    }
  </div>`;

  /* Wave direction */
  html += `<div class="marine-stat">
    <span class="marine-stat__label">Wave Direction</span>
    ${waveDir !== null
      ? `<span class="marine-stat__val">${waveDir}</span>`
      : `<span class="marine-stat__na">River — N/A</span>`
    }
  </div>`;

  html += `</div>`; /* end marine-grid */
  html += `</div></div>`; /* end dash-card, dash-marine */

  /* ── Tide CTA ── */
  html += `
    <div class="tide-cta">
      <div class="tide-cta__text">
        <h3>Tide times</h3>
        <p>DartBuddy doesn't predict tides. Use ADMIRALTY EasyTide for accurate River Dart tide predictions before heading out.</p>
      </div>
      <a href="${loc.tide}" target="_blank" rel="noopener" class="btn btn--tide">
        View Official Tides →
      </a>
    </div>`;

  /* ── 7-Day Forecast ── */
  html += `<p class="forecast-eyebrow">7-Day Forecast</p>`;
  html += `<div class="forecast-row">`;

  for (let i = 0; i < Math.min(7, d.time.length); i++) {
    const dayWmo   = WMO_CODES[d.weather_code[i]] || { icon: '' };
    const maxT     = fmt(d.temperature_2m_max[i], 0);
    const dayWind  = fmt(d.wind_speed_10m_max[i], 0);
    const dayPrecip= fmt(d.precipitation_sum[i], 1);

    html += `
      <div class="forecast-card">
        <span class="forecast-card__day">${i === 0 ? 'Today' : dayName(d.time[i])}</span>
        <span class="forecast-card__temp">${maxT !== null ? maxT : '—'}°</span>
        <span class="forecast-card__wind">${dayWmo.label}</span>
        <span class="forecast-card__precip">Wind ${dayWind !== null ? dayWind : '—'} kn</span>
        <span class="forecast-card__precip">${dayPrecip !== null && parseFloat(dayPrecip) > 0 ? dayPrecip + 'mm' : ''}</span>
      </div>`;
  }

  html += `</div>`; /* end forecast-row */

  /* ── Data note ── */
  html += `
    ${meta.stale ? '<p class="data-note data-note--warning">Showing the most recent saved snapshot because live weather could not be reached.</p>' : ''}
    <p class="data-note">
      Weather data from <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>.
      Marine data from the Open-Meteo Marine API.
      Tides via <a href="https://easytide.admiralty.co.uk/" target="_blank" rel="noopener">ADMIRALTY EasyTide</a>.
      Indicative only — always verify before boating.
    </p>`;

  html += `</div>`; /* end fade-in */

  container.innerHTML = html;
}

/* ============================================================
   MOBILE NAV TOGGLE
   ============================================================ */
function initMobileNav() {
  const toggle   = document.getElementById('navToggle');
  const mobileNav= document.getElementById('mobileNav');
  if (!toggle || !mobileNav) return;

  toggle.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });
}

/* ============================================================
   ACTIVE NAV LINK
   ============================================================ */
function initActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initActiveNav();
  initConditionsPage();
});
