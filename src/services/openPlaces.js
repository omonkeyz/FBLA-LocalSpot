// Free, no-key APIs: Nominatim (geocoding) + Overpass API (business/POI data)

// Multiple Overpass mirrors — tried in order on failure/timeout
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// Fetch with a hard timeout (ms) using AbortController
async function fetchWithTimeout(url, opts = {}, timeoutMs = 18000) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    return res;
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

// ── Build the Overpass QL query string ───────────────────────────────────────
function buildQuery(lat, lng, radius) {
  return `[out:json][timeout:25];(
node["name"]["amenity"~"restaurant|cafe|bar|fast_food|pub|bakery|ice_cream|pharmacy|hospital|clinic|dentist|beauty_salon|hairdresser|cinema|theatre|nightclub|arts_centre|school|university|library|college"](around:${radius},${lat},${lng});
node["name"]["shop"](around:${radius},${lat},${lng});
node["name"]["leisure"~"fitness_centre|spa|gym|sports_centre"](around:${radius},${lat},${lng});
node["name"]["tourism"~"museum|gallery|attraction"](around:${radius},${lat},${lng});
);out center 40;`;
}

// ── Find businesses/POIs — tries each Overpass mirror until one succeeds ─────
export async function findNearbyBusinesses(lat, lng, radius = 5000) {
  const query = buildQuery(lat, lng, radius);
  const encoded = encodeURIComponent(query);

  let lastErr;
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const url = `${mirror}?data=${encoded}`;
      const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 20000);

      if (!res.ok) {
        // 429 = rate-limited, 504 = gateway timeout — try next mirror immediately
        lastErr = new Error(`HTTP ${res.status} from ${mirror}`);
        continue;
      }

      const data = await res.json();
      const elements = (data.elements || []).filter(e => e.tags?.name);

      // If we got results, return them
      if (elements.length > 0) return elements;

      // Empty result from this mirror → try next (different mirror may have more data)
      lastErr = new Error('No results');
    } catch (err) {
      // Timeout or network error — try next mirror
      lastErr = err;
    }
  }

  // All mirrors failed — return empty array so the UI doesn't break
  console.warn('[LocalSpot] All Overpass mirrors failed:', lastErr?.message);
  return [];
}

// ── Map OSM tags → our category keys ─────────────────────────────────────────
function mapTagsToCategory(tags = {}) {
  const a = tags.amenity || '';
  const s = tags.shop    || '';
  const l = tags.leisure || '';
  const t = tags.tourism || '';

  if (['restaurant','cafe','bar','fast_food','pub','bakery','ice_cream','food_court'].includes(a)) return 'food';
  if (['pharmacy','hospital','clinic','dentist','doctors','beauty_salon','hairdresser'].includes(a)
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
