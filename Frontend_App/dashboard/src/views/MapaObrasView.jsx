import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
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

  const openObra = (obraId) => {
    window.history.pushState({}, '', `/obras/${obraId}`);
    setActiveView('obra-detalhe');
  };

  return (
    <div className="h-full w-full min-h-[calc(100vh-64px)] overflow-hidden">
      <MapContainer
        center={[39.5, -8.0]}
        zoom={7}
        className="h-full w-full min-h-[calc(100vh-64px)]"
        scrollWheelZoom
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {obrasWithCoords.map(({ obra, coords }) => {
          const { color, obraTools, openSessions, overdueSessions } = getObraState(obra, tools, toolSessions);
          return (
            <CircleMarker
              key={obra.id}
              center={coords}
              radius={11}
              pathOptions={{
                color: '#0f172a',
                weight: 2,
                fillColor: color,
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="min-w-48 space-y-2">
                  <div>
                    <p className="font-bold text-slate-900">{obra.name || obra.id}</p>
                    {obra.address && <p className="text-xs text-slate-500">{obra.address}</p>}
                  </div>
                  <p className="text-sm text-slate-700">
                    Ferramentas: {obraTools.length} · Em uso: {openSessions.length} · Overdue: {overdueSessions.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => openObra(obra.id)}
                    className="w-full rounded-md bg-primary-600 px-3 py-2 text-sm font-bold text-white hover:bg-primary-700"
                  >
                    Ver obra →
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
