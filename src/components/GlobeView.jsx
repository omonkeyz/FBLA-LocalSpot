import { useEffect, useRef, useState, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useNavigate } from 'react-router-dom';
import {
  Search, Loader2, Globe2, ArrowLeft,
  Utensils, ShoppingBag, Wrench, Heart, Music, BookOpen, MapPin,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CATEGORIES, CATEGORY_COLORS } from '../data/businesses';
import { geocodeCity, findNearbyBusinesses, mapOsmPlaceToBusiness } from '../services/openPlaces';

const CATEGORY_ICONS = {
  food:          Utensils,
  retail:        ShoppingBag,
  services:      Wrench,
  health:        Heart,
  entertainment: Music,
  education:     BookOpen,
};

function getCategoryIconSvg(categoryId, color) {
  const Icon = CATEGORY_ICONS[categoryId] || MapPin;
  return renderToStaticMarkup(<Icon size={17} color={color} strokeWidth={2.2} />);
}

const R = 5; // globe radius

function latLngToVec3(lat, lng, radius = R) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius  * Math.cos(phi),
    radius  * Math.sin(phi) * Math.sin(theta),
  );
}

function vec3ToLatLng(v) {
  const n   = v.clone().normalize();
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, n.y))) * (180 / Math.PI);
  const lng = Math.atan2(n.z, -n.x) * (180 / Math.PI) - 180;
  return [lat, lng];
}

function project(worldPos, camera, domEl) {
  const v = worldPos.clone().project(camera);
  return {
    x: (v.x *  0.5 + 0.5) * domEl.clientWidth,
    y: (v.y * -0.5 + 0.5) * domEl.clientHeight,
  };
}

// ── Full 2D city map overlay (Leaflet) ────────────────────────────────────────
function CityMapOverlay({ businesses, cityCoords, onBack }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const [fading, setFading] = useState(false);

  const triggerBack = useCallback(() => {
    if (fading) return;
    setFading(true);
    setTimeout(onBack, 600);
  }, [fading, onBack]);

  // Re-pan if cityCoords changes while the map is already open
  useEffect(() => {
    if (mapRef.current && cityCoords) {
      mapRef.current.setView(cityCoords, 13, { animate: true });
    }
  }, [cityCoords]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center = cityCoords || businesses[0]?.coords || [39.5, -98.35];

    const map = L.map(containerRef.current, {
      center,
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    if (!document.getElementById('localspot-popup-css')) {
      const style = document.createElement('style');
      style.id = 'localspot-popup-css';
      style.textContent = `
        .localspot-popup .leaflet-popup-content-wrapper {
          background: rgba(6,6,22,0.97) !important;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.7) !important;
          color: #e2e8f0;
        }
        .localspot-popup .leaflet-popup-tip {
          background: rgba(6,6,22,0.97) !important;
        }
        .localspot-popup .leaflet-popup-close-button {
          color: #64748b !important;
          font-size: 18px !important;
          top: 8px !important; right: 10px !important;
        }
        .localspot-popup .leaflet-popup-close-button:hover { color: #fff !important; }
        .localspot-popup .leaflet-popup-content { margin: 14px 14px !important; }
        .ls-submit-btn:hover { filter: brightness(1.1); }
        .ls-review-text:focus { border-color: rgba(99,102,241,0.5) !important; }
        .localspot-popup a[href]:hover { opacity: 0.85; }
      `;
      document.head.appendChild(style);
    }

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri — Source: Esri, USGS, NOAA', maxZoom: 19 },
    ).addTo(map);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      { attribution: '', maxZoom: 19, opacity: 0.8 },
    ).addTo(map);

    const REVIEWS_KEY = 'ls_community_reviews';
    const getAllReviews = () => {
      try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '{}'); } catch { return {}; }
    };
    const getReviews = (bizId) => getAllReviews()[bizId] || [];
    const saveReview = (bizId, review) => {
      const all = getAllReviews();
      all[bizId] = [...(all[bizId] || []), review];
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
    };
    const getAvgRating = (bizId) => {
      const reviews = getReviews(bizId);
      if (!reviews.length) return 0;
      return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
    };

    const makeCaptcha = () => {
      const a = Math.floor(Math.random() * 9) + 1;
      const b = Math.floor(Math.random() * 9) + 1;
      return { q: `${a} + ${b}`, ans: String(a + b) };
    };

    businesses.forEach(biz => {
      if (!biz.coords || biz.coords.length < 2) return;
      const color = CATEGORY_COLORS[biz.category] || '#6366f1';
      const icon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;
          background:${color}cc;
          border:2px solid ${color};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 0 3px ${color}44, 0 3px 16px ${color}88;
          cursor:pointer;
        ">${getCategoryIconSvg(biz.category, '#ffffff')}</div>`,
        className: '',
        iconSize:   [36, 36],
        iconAnchor: [18, 18],
      });
      const typeLabel = (biz.tags?.[0] || biz.category || '').replace(/_/g, ' ');

      const popupEl = document.createElement('div');
      popupEl.style.cssText = 'font-family:system-ui,-apple-system,sans-serif;min-width:230px;max-width:260px';

      const marker = L.marker(biz.coords, { icon }).addTo(map);

      marker.on('popupopen', () => {
        const avg     = getAvgRating(biz.id);
        const reviews = getReviews(biz.id);
        const captcha = makeCaptcha();
        popupEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:38px;height:38px;border-radius:10px;background:${color}20;border:1.5px solid ${color}50;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${getCategoryIconSvg(biz.category, color)}
            </div>
            <div style="flex:1;min-width:0">
              <p style="margin:0 0 2px;font-weight:700;font-size:14px;color:#f8fafc;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${biz.name}</p>
              <span style="display:inline-block;padding:2px 7px;border-radius:20px;background:${color}18;border:1px solid ${color}35;font-size:10px;color:${color};font-weight:600;text-transform:capitalize;letter-spacing:0.3px">${typeLabel}</span>
            </div>
          </div>

          ${(biz.address || biz.phone || biz.hours) ? `
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:8px 10px;margin-bottom:8px;display:flex;flex-direction:column;gap:4px">
            ${biz.address ? `<div style="display:flex;align-items:center;gap:6px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg><span style="font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${biz.address}</span></div>` : ''}
            ${biz.phone   ? `<div style="display:flex;align-items:center;gap:6px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg><span style="font-size:11px;color:#94a3b8">${biz.phone}</span></div>` : ''}
            ${biz.hours   ? `<div style="display:flex;align-items:center;gap:6px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span style="font-size:11px;color:#94a3b8">${biz.hours}</span></div>` : ''}
          </div>` : ''}

          ${biz.website ? `
          <a href="${biz.website}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;gap:5px;width:100%;padding:7px;margin-bottom:10px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);border-radius:8px;color:#818cf8;font-size:11.5px;font-weight:600;text-decoration:none;box-sizing:border-box;letter-spacing:0.2px">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Visit Website
          </a>` : ''}

          <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:10px">
            ${reviews.length > 0 ? `
            <div style="margin-bottom:10px;max-height:110px;overflow-y:auto;display:flex;flex-direction:column;gap:5px">
              ${reviews.slice(-3).reverse().map(r => `
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:7px;padding:6px 8px">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
                    <span style="color:#e2e8f0;font-size:11px;font-weight:600">${r.name || 'Anonymous'}</span>
                    <span style="color:#fbbf24;font-size:11px">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
                  </div>
                  ${r.text ? `<p style="color:#94a3b8;font-size:10.5px;margin:0;line-height:1.4">${r.text}</p>` : ''}
                </div>`).join('')}
            </div>` : ''}

            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <span style="font-size:11.5px;font-weight:600;color:#cbd5e1">Leave a Rating</span>
              ${avg > 0 ? `<span style="font-size:10.5px;color:#fbbf24;font-weight:600">★ ${avg} <span style="color:#475569;font-weight:400">(${reviews.length})</span></span>` : `<span style="font-size:10px;color:#475569">No reviews yet</span>`}
            </div>
            <div class="ls-stars" style="display:flex;gap:2px;margin-bottom:0">
              ${[1,2,3,4,5].map(n => `<span data-val="${n}" style="font-size:26px;cursor:pointer;color:#1e293b;transition:color 0.1s;line-height:1;user-select:none">★</span>`).join('')}
            </div>
            <div class="ls-review-form" style="display:none;margin-top:8px">
              <input class="ls-name-input" placeholder="Your name *" style="width:100%;padding:6px 8px;margin-bottom:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:7px;color:#e2e8f0;font-size:11.5px;font-family:inherit;box-sizing:border-box;outline:none" />
              <textarea class="ls-review-text" placeholder="Share your experience… (optional)" style="width:100%;height:52px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:7px;color:#e2e8f0;font-size:11.5px;padding:7px 8px;resize:none;font-family:inherit;box-sizing:border-box;outline:none;margin-bottom:6px"></textarea>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:7px;padding:6px 8px">
                <span style="color:#64748b;font-size:10px;white-space:nowrap">Verify: ${captcha.q} =</span>
                <input class="ls-captcha-input" placeholder="?" style="flex:1;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);color:#e2e8f0;font-size:12px;font-weight:600;outline:none;padding:1px 4px;font-family:inherit" />
              </div>
              <p class="ls-captcha-err" style="display:none;color:#f87171;font-size:10.5px;margin:0 0 5px;text-align:center">Incorrect answer — try again</p>
              <button class="ls-submit-btn" style="width:100%;padding:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:#fff;font-size:12px;cursor:pointer;font-weight:700;letter-spacing:0.4px;box-shadow:0 2px 12px rgba(99,102,241,0.4)">Submit Review</button>
            </div>
            <p class="ls-thanks" style="display:none;color:#4ade80;font-size:12px;font-weight:600;margin:8px 0 0;text-align:center">✓ Thanks for your review!</p>
          </div>`;

        let selected = 0;
        const stars = popupEl.querySelectorAll('.ls-stars span');
        const form  = popupEl.querySelector('.ls-review-form');
        const thanks = popupEl.querySelector('.ls-thanks');

        stars.forEach(star => {
          const val = parseInt(star.dataset.val);
          star.addEventListener('mouseenter', () => {
            stars.forEach(s => { s.style.color = parseInt(s.dataset.val) <= val ? '#fbbf24' : '#374151'; });
          });
          star.addEventListener('mouseleave', () => {
            stars.forEach(s => { s.style.color = parseInt(s.dataset.val) <= selected ? '#fbbf24' : '#374151'; });
          });
          star.addEventListener('click', () => {
            selected = val;
            stars.forEach(s => { s.style.color = parseInt(s.dataset.val) <= selected ? '#fbbf24' : '#374151'; });
            form.style.display = 'block';
          });
        });

        popupEl.querySelector('.ls-submit-btn')?.addEventListener('click', () => {
          if (!selected) return;
          const name     = popupEl.querySelector('.ls-name-input')?.value.trim() || '';
          const text     = popupEl.querySelector('.ls-review-text')?.value.trim() || '';
          const captchaVal = popupEl.querySelector('.ls-captcha-input')?.value.trim();
          const captchaErr = popupEl.querySelector('.ls-captcha-err');
          if (!name) {
            const ni = popupEl.querySelector('.ls-name-input');
            if (ni) { ni.style.borderColor = 'rgba(248,113,113,0.6)'; ni.focus(); } return;
          }
          if (captchaVal !== captcha.ans) {
            if (captchaErr) captchaErr.style.display = 'block';
            const ci = popupEl.querySelector('.ls-captcha-input');
            if (ci) { ci.value = ''; ci.focus(); } return;
          }
          if (captchaErr) captchaErr.style.display = 'none';
          saveReview(biz.id, { rating: selected, name, text, date: new Date().toISOString() });
          form.style.display   = 'none';
          thanks.style.display = 'block';
          setTimeout(() => marker.closePopup(), 1800);
        });
      });

      marker.bindPopup(popupEl, { maxWidth: 290, className: 'localspot-popup' });
    });

    map.on('zoomend', () => {
      if (map.getZoom() < 8) triggerBack();
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40, borderRadius: 'inherit',
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.65s ease',
    }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <button
        onClick={triggerBack}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 10,
          background: 'rgba(6,6,22,0.9)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <ArrowLeft size={14} />
        Globe View
      </button>

      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 50,
        padding: '6px 12px', borderRadius: 20,
        background: 'rgba(6,6,22,0.85)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#94a3b8', fontSize: 12,
      }}>
        {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} nearby
      </div>
    </div>
  );
}

// ── Floating callout tooltip with downward arrow ───────────────────────────────
function MarkerTooltip({ biz, elRef }) {
  const color = CATEGORY_COLORS[biz.category] || '#6366f1';
  const Icon  = CATEGORY_ICONS[biz.category] || MapPin;

  return (
    <div
      ref={elRef}
      aria-live="polite"
      style={{
        position:       'absolute',
        pointerEvents:  'none',
        zIndex:         30,
        opacity:        0,
        transform:      'translate(-50%, calc(-100% - 14px))',
        transition:     'opacity 0.12s ease',
        willChange:     'left, top',
      }}
    >
      <div
        style={{
          background:      'rgba(6,6,22,0.97)',
          backdropFilter:  'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border:          `1.5px solid ${color}99`,
          borderRadius:    10,
          padding:         '8px 12px',
          minWidth:        136,
          maxWidth:        220,
          boxShadow:       `0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px ${color}22`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Icon size={14} color={color} strokeWidth={2.2} />
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 12.5, margin: 0, lineHeight: 1.3 }}>
            {biz.name}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {biz.rating > 0 && (
            <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 600 }}>★ {biz.rating}</span>
          )}
          <span style={{ color, fontSize: 10.5, fontWeight: 500 }}>{CATEGORIES.find(c => c.id === biz.category)?.label}</span>
        </div>
        {biz.address && (
          <p style={{
            color: '#64748b', fontSize: 10, marginTop: 3, lineHeight: 1.3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 194,
          }}>
            {biz.address}
          </p>
        )}
        <p style={{ color: '#334155', fontSize: 9.5, marginTop: 4 }}>Click to view details</p>
      </div>
      <div style={{
        position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
        borderTop: `7px solid ${color}99`,
      }} />
    </div>
  );
}

// ── Major world cities for the auto-tour ─────────────────────────────────────
const TOUR_CITIES = [
  { name: 'New York',      lat: 40.7128,  lng: -74.0060  },
  { name: 'London',        lat: 51.5074,  lng:  -0.1278  },
  { name: 'Tokyo',         lat: 35.6762,  lng: 139.6503  },
  { name: 'Paris',         lat: 48.8566,  lng:   2.3522  },
  { name: 'Sydney',        lat: -33.8688, lng: 151.2093  },
  { name: 'Dubai',         lat: 25.2048,  lng:  55.2708  },
  { name: 'São Paulo',     lat: -23.5505, lng: -46.6333  },
  { name: 'Mumbai',        lat: 19.0760,  lng:  72.8777  },
  { name: 'Chicago',       lat: 41.8781,  lng: -87.6298  },
  { name: 'Berlin',        lat: 52.5200,  lng:  13.4050  },
  { name: 'Seoul',         lat: 37.5665,  lng: 126.9780  },
  { name: 'Los Angeles',   lat: 34.0522,  lng: -118.2437 },
  { name: 'Toronto',       lat: 43.6532,  lng: -79.3832  },
  { name: 'Singapore',     lat:  1.3521,  lng: 103.8198  },
  { name: 'Amsterdam',     lat: 52.3676,  lng:   4.9041  },
  { name: 'Barcelona',     lat: 41.3851,  lng:   2.1734  },
  { name: 'Mexico City',   lat: 19.4326,  lng: -99.1332  },
  { name: 'Hong Kong',     lat: 22.3193,  lng: 114.1694  },
  { name: 'Istanbul',      lat: 41.0082,  lng:  28.9784  },
  { name: 'Cape Town',     lat: -33.9249, lng:  18.4241  },
  { name: 'Buenos Aires',  lat: -34.6037, lng: -58.3816  },
  { name: 'Bangkok',       lat: 13.7563,  lng: 100.5018  },
  { name: 'Miami',         lat: 25.7617,  lng: -80.1918  },
  { name: 'Rome',          lat: 41.9028,  lng:  12.4964  },
  { name: 'Vienna',        lat: 48.2082,  lng:  16.3738  },
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function GlobeView({ businesses: propBusinesses }) {
  const navigate = useNavigate();

  // Three.js refs
  const containerRef    = useRef(null);
  const rendererRef     = useRef(null);
  const cameraRef       = useRef(null);
  const controlsRef     = useRef(null);
  const globeRef        = useRef(null);
  const sceneRef        = useRef(null);  // for access from callbacks
  const markersRef      = useRef([]);
  const rafRef          = useRef(null);
  const targetCamPosRef = useRef(null);

  // Satellite cursor & dropped pins
  const satCursorRef   = useRef(null);   // THREE.Group — hover cursor on globe surface
  const droppedPinsRef = useRef([]);     // { group: THREE.Group, lat, lng }[]

  // Drag-to-explore
  const dragTimerRef    = useRef(null);
  const lastExploreRef  = useRef(null);  // [lat, lng] of last auto-explored point
  const isExploringRef  = useRef(false);
  const pendingBizLoadRef = useRef(null); // { lat, lng } — load businesses once camera zooms in

  // Hover tooltip refs
  const hoveredEntryRef = useRef(null);
  const tooltipElRef    = useRef(null);

  // Refs mirrored for animation-loop access
  const cityBizListRef      = useRef(null);
  const showCityMapRef      = useRef(false);
  const handleGlobeClickRef = useRef(null);

  // React state
  const [hoveredBiz,  setHoveredBiz]  = useState(null);
  const [cityQuery,   setCityQuery]   = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [cityLabel,   setCityLabel]   = useState('');
  const [cityBizList, setCityBizList] = useState(null);
  const [cityCoords,  setCityCoords]  = useState(null);
  const [showCityMap, setShowCityMap] = useState(false);
  const [isExploring, setIsExploring] = useState(false);
  const [autoTour,    setAutoTour]    = useState(false);

  // Auto-tour refs (stable across renders)
  const autoTourRef      = useRef(false);
  const autoTourTimer    = useRef(null);
  const tourCityIndexRef = useRef(Math.floor(Math.random() * TOUR_CITIES.length));

  useEffect(() => { cityBizListRef.current = cityBizList; }, [cityBizList]);
  useEffect(() => { showCityMapRef.current = showCityMap; }, [showCityMap]);
  useEffect(() => { autoTourRef.current = autoTour; }, [autoTour]);

  const businesses = cityBizList ?? [];

  // ── Auto-tour: step through TOUR_CITIES, load businesses, show map briefly ───
  const runTourStep = useCallback(async () => {
    if (!autoTourRef.current) return;

    // Pick next city in sequence (shuffle through all before repeating)
    const idx  = tourCityIndexRef.current % TOUR_CITIES.length;
    tourCityIndexRef.current = idx + 1;
    const city = TOUR_CITIES[idx];

    // Reset 2D map first
    setShowCityMap(false);
    showCityMapRef.current = false;

    // Fly camera to city
    const cityDir = latLngToVec3(city.lat, city.lng, 1).normalize();
    if (cameraRef.current && controlsRef.current) {
      controlsRef.current.autoRotate = false;
      controlsRef.current.enabled    = false;
      targetCamPosRef.current = cityDir.clone().multiplyScalar(cameraRef.current.position.length());
      setTimeout(() => { if (autoTourRef.current) targetCamPosRef.current = cityDir.clone().multiplyScalar(6); }, 1200);
    }

    setCityLabel(city.name);
    setCityCoords([city.lat, city.lng]);
    lastExploreRef.current = [city.lat, city.lng];

    // Load businesses (non-blocking failure OK)
    try {
      const elements = await findNearbyBusinesses(city.lat, city.lng, 5000);
      const mapped   = elements.map(mapOsmPlaceToBusiness).filter(Boolean).slice(0, 60);
      setCityBizList(mapped.length ? mapped : []);
    } catch { setCityBizList([]); }

    if (!autoTourRef.current) return;

    // Show 2D map after ~3.2s (camera animation completes)
    setTimeout(() => {
      if (!autoTourRef.current) return;
      setShowCityMap(true);
      showCityMapRef.current = true;

      // Stay on 2D map for 5s, then go back to globe for next city
      autoTourTimer.current = setTimeout(() => {
        if (!autoTourRef.current) return;
        setShowCityMap(false);
        showCityMapRef.current = false;
        // Zoom camera back out
        if (cameraRef.current && controlsRef.current) {
          const dir = cameraRef.current.position.clone().normalize();
          targetCamPosRef.current = dir.multiplyScalar(13);
          controlsRef.current.enabled = false;
        }
        // Wait 2s for globe to be visible again, then go to next city
        autoTourTimer.current = setTimeout(() => { if (autoTourRef.current) runTourStep(); }, 2000);
      }, 5000);
    }, 3200);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start / stop auto-tour
  useEffect(() => {
    if (autoTour) {
      runTourStep();
    } else {
      clearTimeout(autoTourTimer.current);
    }
    return () => clearTimeout(autoTourTimer.current);
  }, [autoTour, runTourStep]);

  // ── City search ──────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!cityQuery.trim()) return;
    // Stop auto-tour when user manually searches
    setAutoTour(false);
    autoTourRef.current = false;
    clearTimeout(autoTourTimer.current);

    setIsSearching(true);
    setSearchError('');
    setShowCityMap(false);
    showCityMapRef.current = false;
    hoveredEntryRef.current = null;
    setHoveredBiz(null);

    try {
      const { lat, lng, formatted } = await geocodeCity(cityQuery.trim());
      setCityLabel(formatted);
      setCityCoords([lat, lng]);
      setCityBizList(null);
      lastExploreRef.current = [lat, lng];
      pendingBizLoadRef.current = { lat, lng };

      const cityDir = latLngToVec3(lat, lng, 1).normalize();
      if (cameraRef.current && controlsRef.current) {
        controlsRef.current.autoRotate = false;
        controlsRef.current.enabled    = false;
        targetCamPosRef.current = cityDir.clone().multiplyScalar(cameraRef.current.position.length());
        setTimeout(() => { targetCamPosRef.current = cityDir.clone().multiplyScalar(6); }, 1400);
      }
    } catch (err) {
      setSearchError(err.message || 'Search failed — try a different city name.');
    } finally {
      setIsSearching(false);
    }
  }, [cityQuery]);

  // ── Globe surface click → drop pin + fly + show 2D map ───────────────────────
  const handleGlobePointClick = useCallback(async (worldPos) => {
    const [lat, lng] = vec3ToLatLng(worldPos);

    // Stop auto-tour on manual click
    setAutoTour(false);
    autoTourRef.current = false;
    clearTimeout(autoTourTimer.current);

    setShowCityMap(false);
    showCityMapRef.current = false;

    // ── Drop a visual pin at the clicked location ────────────────────────────
    if (sceneRef.current) {
      // Remove previous dropped pin(s)
      droppedPinsRef.current.forEach(({ group }) => sceneRef.current?.remove(group));
      droppedPinsRef.current = [];

      const norm = worldPos.clone().normalize();
      const pinGroup = new THREE.Group();

      // Glowing core sphere
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.95 });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), coreMat);
      pinGroup.add(core);

      // Pulsing halo ring (flat on surface)
      const haloMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 48), haloMat);
      pinGroup.add(halo);

      // Outer glow ring
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xa5b4fc, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
      const glow = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.30, 48), glowMat);
      pinGroup.add(glow);

      // Upright stem (cylinder in local +Y space)
      const stemMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.6 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8), stemMat);
      stem.position.set(0, 0.225, 0);
      pinGroup.add(stem);

      // Top cap dot on stem
      const capMat = new THREE.MeshBasicMaterial({ color: 0xc7d2fe, transparent: true, opacity: 0.9 });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), capMat);
      cap.position.set(0, 0.47, 0);
      pinGroup.add(cap);

      // Orient the group so local +Y points outward from globe center
      pinGroup.position.copy(worldPos.clone().add(norm.multiplyScalar(0.05)));
      const up = new THREE.Vector3(0, 1, 0);
      pinGroup.quaternion.setFromUnitVectors(up, norm);

      sceneRef.current.add(pinGroup);
      droppedPinsRef.current.push({ group: pinGroup, lat, lng });
    }

    // Rotate camera to face clicked point, then zoom in
    const dir = latLngToVec3(lat, lng, 1).normalize();
    if (cameraRef.current && controlsRef.current) {
      controlsRef.current.autoRotate = false;
      controlsRef.current.enabled    = false;
      targetCamPosRef.current = dir.clone().multiplyScalar(cameraRef.current.position.length());
      setTimeout(() => { targetCamPosRef.current = dir.clone().multiplyScalar(6); }, 900);
    }

    setCityCoords([lat, lng]);
    setCityBizList(null);
    lastExploreRef.current = [lat, lng];
    pendingBizLoadRef.current = { lat, lng };

    // Reverse-geocode for label (non-blocking)
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(r => r.json())
      .then(data => {
        const loc = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.display_name?.split(',')[0] || 'Selected Location';
        setCityLabel(loc);
      }).catch(() => {});
  }, []);

  useEffect(() => { handleGlobeClickRef.current = handleGlobePointClick; }, [handleGlobePointClick]);

  // ── Back to globe ─────────────────────────────────────────────────────────────
  const handleBackToGlobe = useCallback(() => {
    // Stop any running tour
    setAutoTour(false);
    autoTourRef.current = false;
    clearTimeout(autoTourTimer.current);

    setShowCityMap(false);
    showCityMapRef.current = false;
    if (cameraRef.current && controlsRef.current) {
      const dir = cameraRef.current.position.clone().normalize();
      targetCamPosRef.current = dir.multiplyScalar(14);
      controlsRef.current.enabled = false;
    }
  }, []);

  // ── Init Three.js (runs once) ────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    const scene  = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    camera.position.set(0, 0, 14);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.06;
    controls.enableZoom      = true;
    controls.zoomSpeed       = 0.6;
    controls.minDistance     = 5.6;
    controls.maxDistance     = 28;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 0.4;
    controlsRef.current = controls;

    // Stars
    const starPos = [];
    for (let i = 0; i < 4000; i++) {
      const r   = 120 + Math.random() * 80;
      const phi = Math.acos(2 * Math.random() - 1);
      const th  = Math.random() * Math.PI * 2;
      starPos.push(r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, transparent: true, opacity: 0.85 })));

    // Lighting
    scene.add(new THREE.AmbientLight(0x1a2040, 4));
    const sun = new THREE.DirectionalLight(0x8899ff, 4);
    sun.position.set(10, 5, 8);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x6366f1, 1.5);
    rim.position.set(-10, -3, -5);
    scene.add(rim);

    // Globe — textured Earth
    const textureLoader = new THREE.TextureLoader();
    const earthMat = new THREE.MeshPhongMaterial({ specular: new THREE.Color(0x111122), shininess: 30 });
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
      (tex) => { earthMat.map = tex; earthMat.needsUpdate = true; },
    );
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), earthMat);
    scene.add(globe);
    globeRef.current = globe;

    // Country borders
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then(r => r.json())
      .then(data => {
        const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
        data.features.forEach(f => {
          const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
          polys.forEach(poly => {
            poly.forEach(ring => {
              const pts = ring.map(([lng, lat]) => latLngToVec3(lat, lng, R + 0.012));
              if (pts.length < 2) return;
              globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
            });
          });
        });
      })
      .catch(() => {});

    // Atmosphere glow
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R + 0.15, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader:   `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vN; void main(){ float i=pow(1.0-abs(dot(vN,vec3(0.,0.,1.))),3.5); gl_FragColor=vec4(0.38,0.40,0.95,i*0.85); }`,
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      }),
    ));
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(6.4, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, side: THREE.BackSide, transparent: true, opacity: 0.04 }),
    ));

    // ── Satellite hover cursor ─────────────────────────────────────────────────
    // Shows at the globe surface intersection of the mouse ray
    const satGroup = new THREE.Group();

    // Core glowing dot
    const satCoreMat = new THREE.MeshBasicMaterial({ color: 0xa5b4fc, transparent: true, opacity: 0.9 });
    satGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), satCoreMat));

    // Inner ring (tangent to surface)
    const satInnerMat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
    satGroup.add(new THREE.Mesh(new THREE.RingGeometry(0.095, 0.12, 48), satInnerMat));

    // Outer ring
    const satOuterMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    satGroup.add(new THREE.Mesh(new THREE.RingGeometry(0.17, 0.20, 48), satOuterMat));

    satGroup.visible = false;
    scene.add(satGroup);
    satCursorRef.current = satGroup;

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();
    let isDragging = false, mdX = 0, mdY = 0;

    const onMouseDown = e => { mdX = e.clientX; mdY = e.clientY; isDragging = false; };
    const onMouseMoveGlobal = e => {
      if (Math.abs(e.clientX - mdX) > 4 || Math.abs(e.clientY - mdY) > 4) isDragging = true;
    };
    const onMouseMove = e => {
      if (showCityMapRef.current) {
        if (satCursorRef.current) satCursorRef.current.visible = false;
        return;
      }
      const rect = container.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // ── Position satellite cursor at mouse-globe intersection ────────────────
      const cursorHits = raycaster.intersectObject(globe, false);
      if (cursorHits.length && satCursorRef.current) {
        const pt   = cursorHits[0].point;
        const norm = pt.clone().normalize();
        // Offset slightly above surface so it's visible
        satCursorRef.current.position.copy(pt.clone().add(norm.multiplyScalar(0.05)));
        // Orient so rings lie flat on globe surface (local Z points outward)
        satCursorRef.current.lookAt(pt.clone().add(norm.multiplyScalar(2)));
        satCursorRef.current.visible = true;
      } else if (satCursorRef.current) {
        satCursorRef.current.visible = false;
      }

      // Business marker hover
      const hits = raycaster.intersectObjects(markersRef.current.map(m => m.mesh));
      if (hits.length > 0) {
        const found = markersRef.current.find(m => m.mesh === hits[0].object);
        if (found && found.biz.id !== hoveredEntryRef.current?.biz?.id) {
          hoveredEntryRef.current = found;
          setHoveredBiz(found.biz);
          container.style.cursor = 'pointer';
        }
      } else if (hoveredEntryRef.current) {
        hoveredEntryRef.current = null;
        setHoveredBiz(null);
        container.style.cursor = cursorHits.length ? 'crosshair' : 'default';
      } else {
        container.style.cursor = cursorHits.length ? 'crosshair' : 'default';
      }
    };
    const onMouseLeave = () => {
      hoveredEntryRef.current = null;
      setHoveredBiz(null);
      container.style.cursor = 'default';
      if (satCursorRef.current) satCursorRef.current.visible = false;
    };
    const onClick = e => {
      if (isDragging || showCityMapRef.current) return;
      const rect = container.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Marker click (local business)
      const markerHits = raycaster.intersectObjects(markersRef.current.map(m => m.mesh));
      if (markerHits.length) {
        const found = markersRef.current.find(m => m.mesh === markerHits[0].object);
        if (!found) return;
        const biz = found.biz;
        if (biz.isOsmPlace) {
          window.open(biz.website || `https://www.openstreetmap.org/node/${biz.osmId}`, '_blank', 'noopener,noreferrer');
        } else {
          navigate(`/business/${biz.id}`);
        }
        return;
      }

      // Globe surface click → drop pin + load businesses
      const globeHits = raycaster.intersectObject(globe);
      if (globeHits.length) {
        handleGlobeClickRef.current?.(globeHits[0].point);
      }
    };

    // ── Drag-to-explore: after user stops panning while zoomed in, load nearby businesses ──
    const onControlsEnd = () => {
      if (showCityMapRef.current || isExploringRef.current) return;
      // Only fetch businesses when camera is close enough to the globe
      if (camera.position.length() >= 7.5) return;
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = setTimeout(async () => {
        // Cast center-of-screen ray to find what the camera is looking at
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const hits = raycaster.intersectObject(globe, false);
        if (!hits.length) return;

        const [lat, lng] = vec3ToLatLng(hits[0].point);

        // Skip if within ~25km of last loaded location
        if (lastExploreRef.current) {
          const [la, lo] = lastExploreRef.current;
          const d = Math.hypot(lat - la, lng - lo);
          if (d < 0.22) return;
        }

        isExploringRef.current = true;
        setIsExploring(true);
        lastExploreRef.current = [lat, lng];
        pendingBizLoadRef.current = null; // cancel any pending load

        try {
          const elements = await findNearbyBusinesses(lat, lng, 5000);
          const mapped   = elements.map(mapOsmPlaceToBusiness).filter(Boolean).slice(0, 60);
          setCityBizList(mapped);
          setCityCoords([lat, lng]);

          // Reverse-geocode label in background
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
            .then(r => r.json())
            .then(data => {
              const loc = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.display_name?.split(',')[0] || '';
              if (loc) setCityLabel(loc);
            }).catch(() => {});

          setShowCityMap(true);
          showCityMapRef.current = true;
        } catch { /* silent */ } finally {
          isExploringRef.current = false;
          setIsExploring(false);
        }
      }, 1300);
    };

    controls.addEventListener('end', onControlsEnd);

    container.addEventListener('mousedown',  onMouseDown);
    window   .addEventListener('mousemove',  onMouseMoveGlobal);
    container.addEventListener('mousemove',  onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('click',      onClick);

    // ── Animation loop ──────────────────────────────────────────────────────────
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      // Lerp camera toward target position
      if (targetCamPosRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.055);
        if (camera.position.distanceTo(targetCamPosRef.current) < 0.08) {
          camera.position.copy(targetCamPosRef.current);
          targetCamPosRef.current = null;
          if (controls && !controls.enabled) {
            controls.enabled    = true;
            controls.autoRotate = false;
            controls.update();
          }
          // Zoomed in close enough — load businesses for the pending location
          if (pendingBizLoadRef.current && camera.position.length() < 7.5) {
            const { lat, lng } = pendingBizLoadRef.current;
            pendingBizLoadRef.current = null;
            (async () => {
              try {
                const elements = await findNearbyBusinesses(lat, lng, 5000);
                const mapped   = elements.map(mapOsmPlaceToBusiness).filter(Boolean).slice(0, 60);
                setCityBizList(mapped);
                setShowCityMap(true);
                showCityMapRef.current = true;
              } catch { /* silent */ }
            })();
          }
        }
      }

      // Auto-trigger city map when zoomed close enough (businesses already loaded)
      const dist = camera.position.length();
      if (cityBizListRef.current !== null && !showCityMapRef.current && dist < 6.8) {
        showCityMapRef.current = true;
        setShowCityMap(true);
      }

      // ── Animate satellite cursor ──────────────────────────────────────────────
      if (satCursorRef.current?.visible && !showCityMapRef.current) {
        const t = Date.now() * 0.002;
        const [, innerRing, outerRing] = satCursorRef.current.children;
        // Slowly counter-rotate rings for a scanning effect
        if (innerRing) innerRing.rotation.z += 0.009;
        if (outerRing) outerRing.rotation.z -= 0.006;
        // Pulse opacity
        if (innerRing) innerRing.material.opacity = 0.5 + 0.18 * Math.sin(t);
        if (outerRing) outerRing.material.opacity = 0.22 + 0.14 * Math.sin(t * 0.75 + 1);
      } else if (satCursorRef.current && showCityMapRef.current) {
        satCursorRef.current.visible = false;
      }

      // ── Animate dropped pins ──────────────────────────────────────────────────
      droppedPinsRef.current.forEach(({ group }) => {
        if (!group) return;
        const t = Date.now() * 0.0018;
        const halo = group.children[1]; // halo ring
        const glow = group.children[2]; // glow ring
        if (halo) {
          halo.scale.setScalar(1 + 0.14 * Math.sin(t));
          halo.material.opacity = 0.4 + 0.18 * Math.sin(t * 1.1);
        }
        if (glow) {
          glow.scale.setScalar(1 + 0.2 * Math.sin(t * 0.8 + 0.5));
          glow.material.opacity = 0.15 + 0.12 * Math.sin(t * 0.9);
        }
      });

      // Scale hovered marker
      markersRef.current.forEach(({ mesh, biz }) => {
        const isHov = hoveredEntryRef.current?.biz?.id === biz.id;
        mesh.scale.setScalar(isHov ? 2.2 : 1.0);
      });

      // Update tooltip position
      if (hoveredEntryRef.current && tooltipElRef.current) {
        const wp = new THREE.Vector3();
        hoveredEntryRef.current.mesh.getWorldPosition(wp);
        const facing = wp.clone().normalize().dot(camera.position.clone().normalize());
        if (facing > 0.1) {
          const { x, y } = project(wp, camera, renderer.domElement);
          tooltipElRef.current.style.left    = x + 'px';
          tooltipElRef.current.style.top     = y + 'px';
          tooltipElRef.current.style.opacity = '1';
        } else {
          tooltipElRef.current.style.opacity = '0';
        }
      } else if (tooltipElRef.current) {
        tooltipElRef.current.style.opacity = '0';
      }

      if (controls.enabled) controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const W = container.clientWidth, H = container.clientHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(dragTimerRef.current);
      controls.removeEventListener('end', onControlsEnd);
      container.removeEventListener('mousedown',  onMouseDown);
      window   .removeEventListener('mousemove',  onMouseMoveGlobal);
      container.removeEventListener('mousemove',  onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('click',      onClick);
      window   .removeEventListener('resize',     onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      rendererRef.current = null;
      globeRef.current    = null;
      sceneRef.current    = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear globe dot-markers when businesses change (they appear on 2D map only)
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    markersRef.current.forEach(({ mesh }) => { globe.remove(mesh); });
    markersRef.current = [];
    hoveredEntryRef.current = null;
    setHoveredBiz(null);
  }, [businesses]);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        height:     'calc(100vh - 200px)',
        minHeight:  '520px',
        background: 'radial-gradient(ellipse at 50% 40%, #0a0a2a 0%, #04040f 100%)',
      }}
    >
      {/* ── Three.js canvas ── */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} role="img" aria-label="Interactive 3D globe" />

      {/* ── City search bar ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
        <div className="flex gap-2">
          <input
            value={cityQuery}
            onChange={e => setCityQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="City or zip code — e.g. New York, 90210, Tokyo..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:border-indigo-500"
            style={{ background: 'rgba(8,8,24,0.9)', backdropFilter: 'blur(16px)' }}
            aria-label="Search city"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !cityQuery.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center gap-2 flex-shrink-0"
          >
            {isSearching ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Search size={15} aria-hidden="true" />}
            {isSearching ? 'Loading…' : 'Search'}
          </button>
        </div>
        {searchError && (
          <p className="mt-2 text-center text-xs text-red-400" role="alert">{searchError}</p>
        )}
      </div>

      {/* ── Auto-Tour toggle button ── */}
      {!showCityMap && (
        <button
          onClick={() => setAutoTour(v => !v)}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 50,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: autoTour
              ? 'rgba(99,102,241,0.25)'
              : 'rgba(6,6,22,0.85)',
            backdropFilter: 'blur(12px)',
            border: autoTour
              ? '1px solid rgba(99,102,241,0.6)'
              : '1px solid rgba(255,255,255,0.1)',
            color: autoTour ? '#a5b4fc' : '#64748b',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {autoTour
            ? <><Loader2 size={13} className="animate-spin" /> Stop Tour</>
            : <><Globe2 size={13} /> Auto-Tour</>}
        </button>
      )}

      {/* ── City label badge ── */}
      {cityLabel && !showCityMap && (
        <div className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 z-20">
          <span
            className="text-xs text-indigo-300 px-3 py-1 rounded-full flex items-center gap-1.5"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
          >
            <Globe2 size={11} aria-hidden="true" />
            {cityLabel}
          </span>
        </div>
      )}

      {/* ── Drag-to-explore loading indicator ── */}
      {isExploring && !showCityMap && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 pointer-events-none"
          style={{ background: 'rgba(6,6,22,0.88)', backdropFilter: 'blur(12px)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '6px 14px' }}
        >
          <Loader2 size={12} className="animate-spin text-indigo-400" />
          <span style={{ color: '#a5b4fc', fontSize: 12, fontWeight: 600 }}>Loading area…</span>
        </div>
      )}

      {/* ── Hover tooltip ── */}
      {hoveredBiz && !showCityMap && <MarkerTooltip biz={hoveredBiz} elRef={tooltipElRef} />}

      {/* ── Bottom hint ── */}
      {!showCityMap && !isExploring && (
        <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
          <span
            className="text-xs text-slate-600 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
          >
            Click to drop a pin · Drag to explore · Scroll to zoom
          </span>
        </div>
      )}

      {/* ── 2D city map overlay ── */}
      {showCityMap && cityCoords && (
        <CityMapOverlay
          businesses={businesses}
          cityCoords={cityCoords}
          onBack={handleBackToGlobe}
        />
      )}
    </div>
  );
}
