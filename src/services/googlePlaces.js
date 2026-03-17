// Google Places API service — loads the Maps JS API on demand

let apiPromise = null;

export function loadGoogleMapsApi() {
  if (window.google?.maps?.places) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key || key === 'your_api_key_here') {
      apiPromise = null;
      reject(new Error('NO_API_KEY'));
      return;
    }

    const cbName = '__gmInit_' + Date.now();
    window[cbName] = () => { resolve(); delete window[cbName]; };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=${cbName}`;
    script.onerror = () => { apiPromise = null; reject(new Error('Failed to load Google Maps API')); };
    document.head.appendChild(script);
  });

  return apiPromise;
}

export async function geocodeCity(cityName) {
  await loadGoogleMapsApi();
  return new Promise((resolve, reject) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: cityName }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng(), formatted: results[0].formatted_address });
      } else {
        reject(new Error(`City not found: "${cityName}"`));
      }
    });
  });
}

export async function findNearbyBusinesses(lat, lng, radius = 2500) {
  await loadGoogleMapsApi();
  return new Promise((resolve, reject) => {
    const svc = new window.google.maps.places.PlacesService(document.createElement('div'));
    svc.nearbySearch(
      { location: new window.google.maps.LatLng(lat, lng), radius, type: 'establishment' },
      (results, status) => {
        if (status === 'OK' || status === 'ZERO_RESULTS') resolve(results || []);
        else reject(new Error(`Places search failed: ${status}`));
      },
    );
  });
}

export async function findPlaceByText(query) {
  await loadGoogleMapsApi();
  return new Promise((resolve) => {
    const svc = new window.google.maps.places.PlacesService(document.createElement('div'));
    svc.findPlaceFromQuery(
      { query, fields: ['place_id', 'name', 'geometry'] },
      (results, status) => resolve(status === 'OK' ? results[0] : null),
    );
  });
}

export async function getPlaceDetails(placeId) {
  await loadGoogleMapsApi();
  return new Promise((resolve, reject) => {
    const svc = new window.google.maps.places.PlacesService(document.createElement('div'));
    svc.getDetails(
      {
        placeId,
        fields: [
          'name', 'rating', 'reviews', 'user_ratings_total',
          'formatted_address', 'formatted_phone_number',
          'opening_hours', 'photos', 'types', 'geometry', 'business_status',
        ],
      },
      (place, status) => {
        if (status === 'OK') resolve(place);
        else reject(new Error(`Place details failed: ${status}`));
      },
    );
  });
}

function mapTypeToCategory(types = []) {
  const t = types;
  if (t.some(x => ['restaurant','cafe','bakery','bar','food','meal_delivery','meal_takeaway'].includes(x))) return 'food';
  if (t.some(x => ['clothing_store','shoe_store','jewelry_store','book_store','electronics_store','department_store','shopping_mall','supermarket','convenience_store'].includes(x))) return 'retail';
  if (t.some(x => ['health','pharmacy','hospital','doctor','dentist','beauty_salon','hair_care','spa','gym','physiotherapist'].includes(x))) return 'health';
  if (t.some(x => ['movie_theater','bowling_alley','amusement_park','museum','art_gallery','night_club','casino','stadium','zoo'].includes(x))) return 'entertainment';
  if (t.some(x => ['school','university','library'].includes(x))) return 'education';
  return 'services';
}

export function mapGooglePlaceToBusiness(place) {
  const category = mapTypeToCategory(place.types || []);
  let photo = null;
  try { photo = place.photos?.[0]?.getUrl({ maxWidth: 600 }); } catch {}

  return {
    id: `google_${place.place_id}`,
    placeId: place.place_id,
    name: place.name,
    category,
    description: `${place.name} — ${(place.types?.[0] || 'local business').replace(/_/g, ' ')}`,
    address: place.vicinity || place.formatted_address || '',
    phone: place.formatted_phone_number || '',
    hours: place.opening_hours?.weekday_text?.[new Date().getDay()] || 'See Google for hours',
    image: photo || 'https://images.unsplash.com/photo-1444492417251-9c84a5fa18e0?w=600&auto=format&fit=crop&q=80',
    rating: place.rating || 0,
    reviewCount: place.user_ratings_total || 0,
    coords: [place.geometry.location.lat(), place.geometry.location.lng()],
    deals: [],
    tags: (place.types || []).slice(0, 4).map(t => t.replace(/_/g, ' ')),
    verified: place.business_status === 'OPERATIONAL',
    featured: false,
    isGooglePlace: true,
  };
}
