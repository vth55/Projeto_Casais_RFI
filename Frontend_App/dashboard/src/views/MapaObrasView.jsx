import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useStore from '../store/useStore';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'number') return new Date(value);
  return new Date(value);
}

function getObraCoords(obra) {
  const lat = obra?.gps?.latitude ?? obra?.gps?.lat ?? obra?.lat;
  const lng = obra?.gps?.longitude ?? obra?.gps?.lng ?? obra?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return [lat, lng];
}

function getObraState(obra, tools, toolSessions) {
  const obraTools = tools.filter((tool) => tool.currentObraId === obra.id);
  const openSessions = toolSessions.filter(
    (session) => session.obraId === obra.id && session.status === 'OPEN',
  );
  const overdueSessions = openSessions.filter((session) => {
    const start = toDate(session.startTime);
    return start && Date.now() - start.getTime() > 7 * DAY_MS;
  });

  if (overdueSessions.length > 0) return { color: '#ef4444', obraTools, openSessions, overdueSessions };
  if (openSessions.length > 0) return { color: '#10b981', obraTools, openSessions, overdueSessions };
  if (obraTools.length > 0) return { color: '#f59e0b', obraTools, openSessions, overdueSessions };
  return { color: '#94a3b8', obraTools, openSessions, overdueSessions };
}

export default function MapaObrasView() {
  const mapNodeRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const {
    obras = [],
    tools = [],
    toolSessions = [],
    setActiveView,
  } = useStore();

  const obrasWithCoords = useMemo(
    () => obras
      .map((obra) => ({ obra, coords: getObraCoords(obra) }))
      .filter(({ coords }) => coords),
    [obras],
  );

  useEffect(() => {
    if (!mapNodeRef.current || mapInstanceRef.current) return;

    const map = L.map(mapNodeRef.current, {
      center: [39.5, -8.0],
      zoom: 7,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      markersLayer.clearLayers();
      map.remove();
      markersLayerRef.current = null;
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer) return;

    markersLayer.clearLayers();

    obrasWithCoords.forEach(({ obra, coords }) => {
      const { color, obraTools, openSessions, overdueSessions } = getObraState(obra, tools, toolSessions);
      const marker = L.circleMarker(coords, {
        radius: 11,
        color: '#0f172a',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      });

      const popup = document.createElement('div');
      popup.className = 'min-w-48 space-y-2';
      popup.innerHTML = `
        <div>
          <p class="font-bold text-slate-900">${obra.name || obra.id}</p>
          ${obra.address ? `<p class="text-xs text-slate-500">${obra.address}</p>` : ''}
        </div>
        <p class="text-sm text-slate-700">
          Equipamentos: ${obraTools.length} · Em uso: ${openSessions.length} · Atrasados: ${overdueSessions.length}
        </p>
      `;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'w-full rounded-md bg-primary-600 px-3 py-2 text-sm font-bold text-white hover:bg-primary-700';
      button.textContent = 'Ver obra →';
      button.addEventListener('click', () => {
        window.history.pushState({}, '', `/obras/${obra.id}`);
        setActiveView('obra-detalhe');
      });
      popup.appendChild(button);

      marker.bindPopup(popup);
      marker.addTo(markersLayer);
    });
  }, [obrasWithCoords, tools, toolSessions, setActiveView]);

  return (
    <div className="relative h-full w-full min-h-[calc(100vh-64px)] overflow-hidden">
      <div className="absolute left-4 right-4 top-20 z-[500] max-w-xl rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <p className="text-sm font-bold text-slate-900 dark:text-white">Onde estão</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Mapa por obra com base na última leitura NFC. Não é localização real-time dos equipamentos.
        </p>
      </div>
      <div
        ref={mapNodeRef}
        className="h-full w-full min-h-[calc(100vh-64px)]"
        aria-label="Mapa de obras"
      />
    </div>
  );
}
