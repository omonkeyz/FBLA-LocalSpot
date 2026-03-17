import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Glowing emoji marker ──────────────────────────────────────────────────────
function makeDetailMarker(emoji, color) {
  return L.divIcon({
    html: `<div style="
      width:44px;height:44px;
      background:${color}cc;
      border:2.5px solid ${color};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:22px;
      box-shadow:0 0 0 4px ${color}44, 0 4px 24px ${color}88;
    ">${emoji}</div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/**
 * MiniMap — static (non-interactive) Leaflet map for the BusinessDetail page.
 * Uses raw Leaflet (no react-leaflet) to avoid hook conflicts.
 * Props: coords [lat,lng], name, color, emoji
 */
export default function MiniMap({ coords, name, color = '#6366f1', emoji = '📍' }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!coords || coords.length < 2) return;

    const map = L.map(containerRef.current, {
      center: coords,
      zoom: 15,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Soft glow circle around the location
    L.circle(coords, {
      radius: 80,
      color,
      fillColor: color,
      fillOpacity: 0.12,
      weight: 1.5,
      opacity: 0.4,
    }).addTo(map);

    // Glowing emoji marker
    L.marker(coords, { icon: makeDetailMarker(emoji, color) })
      .addTo(map)
      .bindTooltip(name, { permanent: false, direction: 'top', offset: [0, -24] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [coords, color, emoji, name]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '220px' }}
      aria-label={`Map showing location of ${name}`}
      role="img"
    />
  );
}
