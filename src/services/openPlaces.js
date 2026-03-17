// Free, no-key APIs: Nominatim (geocoding + bbox POI search) + Overpass POST fallback

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// In-memory cache keyed by rounded lat/lng
const _cache = new Map();
function cacheKey(lat, lng, radius) {
  return `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

// ── Geocode a city name → { lat, lng, formatted } ────────────────────────────
export async function geocodeCity(cityName) {
  const isUsZip = /^\d{5}$/.test(cityName.trim());
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}` +
    `&format=json&limit=1&addressdetails=1` +
    (isUsZip ? '&countrycodes=us' : '');

  const res = await fetchWithTimeout(url, {
    headers: { 'Accept-Language': 'en-US,en', Accept: 'application/json' },
  }, 12000);

  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if (!data.length) throw new Error(`City not found: "${cityName}"`);

  const { lat, lon, display_name } = data[0];
  const parts     = display_name.split(',');
  const formatted = parts.slice(0, 2).join(',').trim();
  return { lat: parseFloat(lat), lng: parseFloat(lon), formatted };
}

// ── Nominatim bbox search (primary — same server, always fast) ────────────────
// Searches one term (e.g. "restaurant") within a bounding box
async function nominatimSearch(term, viewbox) {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=json&limit=50&q=${encodeURIComponent(term)}` +
    `&bounded=1&viewbox=${viewbox}` +
    `&addressdetails=0`;
  const res = await fetchWithTimeout(url, {
    headers: { 'Accept-Language': 'en-US,en', Accept: 'application/json' },
  }, 10000);
  if (!res.ok) return [];
  const data = await res.json();
  return data.filter(d => d.display_name && d.lat && d.lon);
}

// Convert radius (metres) → viewbox string "minLng,maxLat,maxLng,minLat"
function toViewbox(lat, lng, radiusM) {
  const deg = (radiusM / 111320);          // rough metres → degrees
  const dLng = deg / Math.cos(lat * Math.PI / 180);
  return `${lng - dLng},${lat + deg},${lng + dLng},${lat - deg}`;
}

// Map a Nominatim result to our OSM-element shape so mapOsmPlaceToBusiness works
// Nominatim uses `class` (the OSM key) and `type` (the OSM value)
function nominatimToElement(item) {
  const cls  = item.class || '';   // e.g. "amenity", "shop", "leisure", "tourism"
  const type = item.type  || '';   // e.g. "restaurant", "convenience", "gym"
  const tags = {
    name:    item.name || item.display_name.split(',')[0].trim(),
    amenity: cls === 'amenity' ? type : undefined,
    shop:    cls === 'shop'    ? type : undefined,
    leisure: cls === 'leisure' ? type : undefined,
    tourism: cls === 'tourism' ? type : undefined,
  };
  return {
    id:  item.osm_id || item.place_id,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    tags,
  };
}

// ── Overpass POST fallback ────────────────────────────────────────────────────
function buildOverpassQuery(lat, lng, radius) {
  return `[out:json][timeout:25];
(
  node["name"]["amenity"](around:${radius},${lat},${lng});
  node["name"]["shop"](around:${radius},${lat},${lng});
  node["name"]["leisure"~"fitness_centre|spa|gym|sports_centre"](around:${radius},${lat},${lng});
  node["name"]["tourism"~"museum|gallery|attraction|hotel"](around:${radius},${lat},${lng});
  way["name"]["amenity"](around:${radius},${lat},${lng});
  way["name"]["shop"](around:${radius},${lat},${lng});
);
out center 60;`;
}

async function tryOverpass(lat, lng, radius) {
  const query = buildOverpassQuery(lat, lng, radius);
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetchWithTimeout(mirror, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `data=${encodeURIComponent(query)}`,
      }, 20000);
      if (!res.ok) continue;
      const data = await res.json();
      const els = (data.elements || []).filter(e => e.tags?.name);
      if (els.length > 0) return els;
    } catch { /* try next mirror */ }
  }
  return [];
}

// ── Main: Nominatim first, Overpass fallback ──────────────────────────────────
export async function findNearbyBusinesses(lat, lng, radius = 5000) {
  const key = cacheKey(lat, lng, radius);
  if (_cache.has(key)) return _cache.get(key);

  // 1. Nominatim bbox — fire 4 searches in parallel (staggered 200 ms to respect rate limit)
  const viewbox = toViewbox(lat, lng, radius);
  const terms   = ['restaurant', 'shop', 'cafe', 'hotel museum bar pharmacy gym'];
  const delay   = (ms) => new Promise(r => setTimeout(r, ms));

  const nominatimResults = await Promise.all(
    terms.map((term, i) => delay(i * 220).then(() => nominatimSearch(term, viewbox)))
  );

  // Deduplicate by place_id
  const seen = new Set();
  const nominatimElements = [];
  for (const batch of nominatimResults) {
    for (const item of batch) {
      if (!seen.has(item.place_id)) {
        seen.add(item.place_id);
        nominatimElements.push(nominatimToElement(item));
      }
    }
  }

  if (nominatimElements.length >= 5) {
    _cache.set(key, nominatimElements);
    return nominatimElements;
  }

  // 2. Nominatim came up short → try Overpass POST
  console.info('[LocalSpot] Nominatim sparse, trying Overpass POST…');
  const overpassElements = await tryOverpass(lat, lng, radius);

  // Merge both (Nominatim + Overpass), deduplicate by name+coords
  const merged = [...nominatimElements, ...overpassElements];
  const nameSet = new Set(nominatimElements.map(e => e.tags.name?.toLowerCase()));
  const combined = [
    ...nominatimElements,
    ...overpassElements.filter(e => !nameSet.has(e.tags?.name?.toLowerCase())),
  ];

  // If still empty, widen radius and retry Overpass
  if (combined.length === 0) {
    console.warn('[LocalSpot] No results, widening radius…');
    const wider = await tryOverpass(lat, lng, radius * 2);
    _cache.set(key, wider);
    return wider;
  }

  _cache.set(key, combined);
  return combined;
}

// ── Map OSM/Nominatim tags → category ────────────────────────────────────────
function mapTagsToCategory(tags = {}) {
  const a = tags.amenity || '';
  const s = tags.shop    || '';
  const l = tags.leisure || '';
  const t = tags.tourism || '';

  if (['restaurant','cafe','bar','fast_food','pub','bakery','ice_cream',
       'food_court','biergarten'].includes(a)) return 'food';
  if (['pharmacy','hospital','clinic','dentist','doctors',
       'beauty_salon','hairdresser'].includes(a)
    || ['fitness_centre','spa','gym','sports_centre'].includes(l)) return 'health';
  if (['cinema','theatre','nightclub','arts_centre'].includes(a)
    || ['museum','gallery','attraction'].includes(t)) return 'entertainment';
  if (['school','university','library','college'].includes(a)) return 'education';
  if (s) return 'retail';
  // Guess from Nominatim type string
  if (['bar','pub','cafe','restaurant','fast_food'].includes(a)) return 'food';
  return 'services';
}

const FALLBACK_IMAGES = {
  food:          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
  retail:        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80',
  health:        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80',
  entertainment: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  education:     'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&auto=format&fit=crop&q=80',
  services:      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
};

// ── Convert element → business shape ─────────────────────────────────────────
export function mapOsmPlaceToBusiness(element) {
  const tags     = element.tags || {};
  const category = mapTagsToCategory(tags);
  const lat      = element.lat  ?? element.center?.lat;
  const lng      = element.lon  ?? element.center?.lon;
  if (!lat || !lng || !tags.name) return null;

  const addr = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']]
    .filter(Boolean).join(' ');

  const typeLabel = (tags.amenity || tags.shop || tags.leisure || tags.tourism || 'local business')
    .replace(/_/g, ' ');

  return {
    id:          `osm_${element.id}`,
    osmId:       element.id,
    name:        tags.name,
    category,
    description: `${tags.name} — ${typeLabel}`,
    address:     addr || '',
    phone:       tags.phone || tags['contact:phone'] || '',
    hours:       tags.opening_hours || '',
    image:       FALLBACK_IMAGES[category],
    rating:      0,
    reviewCount: 0,
    coords:      [lat, lng],
    deals:       [],
    tags:        [tags.amenity, tags.shop, tags.leisure, tags.cuisine, tags.tourism]
                   .filter(Boolean).map(t => t.replace(/_/g, ' ')).slice(0, 4),
    verified:    false,
    featured:    false,
    isOsmPlace:  true,
    website:     tags.website || tags['contact:website'] || '',
  };
}
