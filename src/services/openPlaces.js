// Business data: Geoapify Places API (primary) + Nominatim geocoding
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY;

// Geoapify category groups to fetch — broad enough to cover all business types
const GEOAPIFY_CATEGORIES = [
  'catering',           // restaurants, cafes, bars, fast food, bakeries
  'commercial',         // shops, supermarkets, malls, clothing, electronics
  'healthcare',         // pharmacies, hospitals, dentists, clinics
  'leisure',            // gyms, cinemas, spas, bowling, parks
  'tourism',            // museums, attractions, hotels
  'education',          // schools, universities, libraries
  'service',            // banks, laundry, beauty salons, repair shops
  'entertainment',      // theatres, nightclubs, arcades
].join(',');

// In-memory cache keyed by rounded lat/lng + radius
const _cache = new Map();
function cacheKey(lat, lng, radius) {
  return `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 12000) {
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

// ── Geoapify Places API ───────────────────────────────────────────────────────
async function fetchGeoapify(lat, lng, radius) {
  const url =
    `https://api.geoapify.com/v2/places` +
    `?categories=${GEOAPIFY_CATEGORIES}` +
    `&filter=circle:${lng},${lat},${radius}` +
    `&limit=100` +
    `&apiKey=${GEOAPIFY_KEY}`;

  const res = await fetchWithTimeout(url, {
    headers: { Accept: 'application/json' },
  }, 12000);

  if (!res.ok) throw new Error(`Geoapify HTTP ${res.status}`);
  const data = await res.json();
  return data.features || [];
}

// ── Main: find businesses near lat/lng ───────────────────────────────────────
export async function findNearbyBusinesses(lat, lng, radius = 5000) {
  const key = cacheKey(lat, lng, radius);
  if (_cache.has(key)) return _cache.get(key);

  try {
    let features = await fetchGeoapify(lat, lng, radius);

    // If sparse, widen radius once
    if (features.length < 5) {
      features = await fetchGeoapify(lat, lng, radius * 2);
    }

    _cache.set(key, features);
    return features;
  } catch (err) {
    console.warn('[LocalSpot] Geoapify failed:', err.message);
    _cache.set(key, []);
    return [];
  }
}

// ── Map Geoapify feature → our category keys ─────────────────────────────────
function geoapifyCategory(categories = []) {
  const cats = categories.join(' ');
  if (cats.includes('catering'))     return 'food';
  if (cats.includes('healthcare'))   return 'health';
  if (cats.includes('leisure') || cats.includes('entertainment') || cats.includes('sport'))
    return 'entertainment';
  if (cats.includes('education'))    return 'education';
  if (cats.includes('commercial'))   return 'retail';
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

// ── Convert a Geoapify feature → our business shape ──────────────────────────
export function mapOsmPlaceToBusiness(feature) {
  // Accept both Geoapify GeoJSON features and raw OSM elements (fallback compat)
  if (feature?.geometry) {
    // Geoapify GeoJSON feature
    const p    = feature.properties || {};
    const cats = p.categories || [];
    const category = geoapifyCategory(cats);
    const [lng, lat] = feature.geometry.coordinates;
    if (!lat || !lng || !p.name) return null;

    const typeLabel = (cats[0] || 'local business')
      .split('.').pop().replace(/_/g, ' ');

    return {
      id:          `geo_${p.place_id || Math.random()}`,
      name:        p.name,
      category,
      description: `${p.name} — ${typeLabel}`,
      address:     p.formatted || p.address_line1 || '',
      phone:       p.contact?.phone || p.datasource?.raw?.phone || '',
      hours:       p.opening_hours || '',
      image:       FALLBACK_IMAGES[category],
      rating:      0,
      reviewCount: 0,
      coords:      [lat, lng],
      deals:       [],
      tags:        cats.map(c => c.split('.').pop().replace(/_/g, ' ')).slice(0, 4),
      verified:    false,
      featured:    false,
      isOsmPlace:  true,
      website:     p.website || p.contact?.website || p.datasource?.raw?.website || '',
    };
  }

  // Legacy OSM element (kept for backward compat with Overpass fallback)
  const tags     = feature.tags || {};
  const category = legacyCategory(tags);
  const lat      = feature.lat  ?? feature.center?.lat;
  const lng      = feature.lon  ?? feature.center?.lon;
  if (!lat || !lng || !tags.name) return null;

  const addr = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']]
    .filter(Boolean).join(' ');
  const typeLabel = (tags.amenity || tags.shop || tags.leisure || tags.tourism || 'local business')
    .replace(/_/g, ' ');

  return {
    id:          `osm_${feature.id}`,
    osmId:       feature.id,
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

function legacyCategory(tags = {}) {
  const a = tags.amenity || '', s = tags.shop || '', l = tags.leisure || '', t = tags.tourism || '';
  if (['restaurant','cafe','bar','fast_food','pub','bakery','ice_cream'].includes(a)) return 'food';
  if (['pharmacy','hospital','clinic','dentist'].includes(a)
    || ['fitness_centre','spa','gym'].includes(l)) return 'health';
  if (['cinema','theatre','nightclub'].includes(a) || ['museum','gallery'].includes(t)) return 'entertainment';
  if (['school','university','library'].includes(a)) return 'education';
  if (s) return 'retail';
  return 'services';
}
