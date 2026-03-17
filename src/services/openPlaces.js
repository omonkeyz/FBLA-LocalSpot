// Free, no-key APIs: Nominatim (geocoding) + Overpass API via POST (business/POI data)

// Multiple Overpass mirrors — POST is far more reliable than GET (no URL-length limits)
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// In-memory cache: key = "lat,lng,radius" → OSM elements array
const _cache = new Map();
function cacheKey(lat, lng, radius) {
  // Round to 3 decimal places (~111 m grid) so nearby searches reuse results
  return `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
}

// Fetch with a hard timeout using AbortController
async function fetchWithTimeout(url, opts = {}, timeoutMs = 20000) {
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

// ── Build Overpass QL query ───────────────────────────────────────────────────
function buildQuery(lat, lng, radius) {
  // Broad query: amenity + shop + leisure + tourism — catches everything
  return `[out:json][timeout:30];
(
  node["name"]["amenity"](around:${radius},${lat},${lng});
  node["name"]["shop"](around:${radius},${lat},${lng});
  node["name"]["leisure"~"fitness_centre|spa|gym|sports_centre|swimming_pool"](around:${radius},${lat},${lng});
  node["name"]["tourism"~"museum|gallery|attraction|hotel|hostel"](around:${radius},${lat},${lng});
  way["name"]["amenity"](around:${radius},${lat},${lng});
  way["name"]["shop"](around:${radius},${lat},${lng});
);
out center 60;`;
}

// ── POST to one Overpass mirror ───────────────────────────────────────────────
async function tryMirror(mirror, query) {
  const res = await fetchWithTimeout(
    mirror,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    },
    25000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.elements || []).filter(e => e.tags?.name);
}

// ── Find businesses — POST to mirrors, cache results ─────────────────────────
export async function findNearbyBusinesses(lat, lng, radius = 5000) {
  const key = cacheKey(lat, lng, radius);
  if (_cache.has(key)) return _cache.get(key);

  // Try a wider radius if original comes back empty
  const radii = [radius, radius * 1.5, radius * 2.5];

  for (const r of radii) {
    const query = buildQuery(lat, lng, r);
    let lastErr;

    for (const mirror of OVERPASS_MIRRORS) {
      try {
        const elements = await tryMirror(mirror, query);
        if (elements.length > 0) {
          _cache.set(key, elements);
          return elements;
        }
        // empty → try next mirror
      } catch (err) {
        lastErr = err;
        // timeout / HTTP error → try next mirror
      }
    }

    // All mirrors returned empty at this radius → widen and retry
    console.warn(`[LocalSpot] No results at radius ${r}m, widening…`);
  }

  console.warn('[LocalSpot] All mirrors/radii exhausted, returning []');
  _cache.set(key, []);
  return [];
}

// ── Map OSM tags → our category keys ─────────────────────────────────────────
function mapTagsToCategory(tags = {}) {
  const a = tags.amenity || '';
  const s = tags.shop    || '';
  const l = tags.leisure || '';
  const t = tags.tourism || '';

  if (['restaurant','cafe','bar','fast_food','pub','bakery','ice_cream',
       'food_court','biergarten','juice_bar'].includes(a)) return 'food';
  if (['pharmacy','hospital','clinic','dentist','doctors',
       'beauty_salon','hairdresser'].includes(a)
    || ['fitness_centre','spa','gym','sports_centre','swimming_pool'].includes(l)) return 'health';
  if (['cinema','theatre','nightclub','arts_centre'].includes(a)
    || ['museum','gallery','attraction'].includes(t)) return 'entertainment';
  if (['school','university','library','college'].includes(a)) return 'education';
  if (s) return 'retail';
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

// ── Convert an OSM element → our business shape ───────────────────────────────
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
