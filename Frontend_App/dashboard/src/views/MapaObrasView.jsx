import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import useStore from '../store/useStore';
import { getObraCoords } from '../utils/gpsUtils';

const DAY_MS = 24 * 60 * 60 * 1000;

// Guard global para sobreviver ao double-mount do React 19 StrictMode.
// react-leaflet 4.2.1 não tolera re-init do container; usamos Leaflet
// directamente e protegemos com esta flag de módulo.
let _mapInitialized = false;

const LEGEND = [
  { color: '#005EB8', label: 'Sessões ativas' },
  { color: '#f59e0b', label: 'Sem sessão ativa' },
  { color: '#ef4444', label: 'Atrasado >7 dias' },
  { color: '#94a3b8', label: 'Sem equipamentos' },
];

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'number') return new Date(value);
  return new Date(value);
}

function getObraState(obra, tools, toolSessions) {
  const obraTools = tools.filter((t) => t.currentObraId === obra.id);
  const openSessions = toolSessions.filter(
    (s) => s.obraId === obra.id && s.status === 'OPEN',
  );
  const overdueSessions = openSessions.filter((s) => {
    const start = toDate(s.startTime);
    return start && Date.now() - start.getTime() > 7 * DAY_MS;
  });

  if (overdueSessions.length > 0) return { color: '#ef4444', obraTools, openSessions, overdueSessions };
  if (openSessions.length > 0)    return { color: '#005EB8', obraTools, openSessions, overdueSessions };
  if (obraTools.length > 0)       return { color: '#f59e0b', obraTools, openSessions, overdueSessions };
  return                                 { color: '#94a3b8', obraTools, openSessions, overdueSessions };
}

function createPinIcon(color, count) {
  const badge = count > 0
    ? `<div style="position:absolute;top:-4px;right:-5px;background:${color};color:white;font-size:9px;font-weight:700;min-width:16px;height:16px;border-radius:99px;display:flex;align-items:center;justify-content:center;border:2px solid white;padding:0 3px;box-shadow:0 1px 3px rgba(0,0,0,0.28);">${count > 99 ? '99+' : count}</div>`
    : '';

  return L.divIcon({
    html: `<div style="position:relative;width:32px;height:40px;pointer-events:none;"><svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 5px rgba(0,0,0,0.3));pointer-events:none;"><path d="M16 1C8.268 1 2 7.268 2 15c0 10.25 14 24 14 24S30 25.25 30 15C30 7.268 23.732 1 16 1z" fill="${color}" stroke="white" stroke-width="1.5"/><circle cx="16" cy="15" r="5" fill="white" fill-opacity="0.9"/></svg>${badge}</div>`,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
  });
}

function makePopupEl(obra, obraTools, openSessions, overdueSessions, setActiveView) {
  const isOverdue = overdueSessions.length > 0;
  const isActive  = openSessions.length > 0;
  const statusLabel = isOverdue ? 'Atraso' : isActive ? 'Em curso' : obraTools.length > 0 ? 'Com equip.' : 'Sem ativ.';
  const statusColor = isOverdue ? '#ef4444' : isActive ? '#005EB8' : '#94a3b8';

  const el = document.createElement('div');
  el.style.cssText = 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;width:216px;';
  el.innerHTML = `
    <div style="padding:2px 0 10px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:10px;">
        <div style="flex:1;min-width:0;">
          <p style="font-weight:700;font-size:14px;color:#0f172a;margin:0;line-height:1.3;">${obra.name || obra.id}</p>
          ${obra.address ? `<p style="font-size:11px;color:#94a3b8;margin:2px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${obra.address}">${obra.address}</p>` : ''}
        </div>
        <span style="flex-shrink:0;font-size:10px;font-weight:600;color:${statusColor};background:${statusColor}18;border:1px solid ${statusColor}40;padding:2px 7px;border-radius:99px;line-height:1.4;">${statusLabel}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:${isOverdue ? '8px' : '12px'};">
        <div style="background:#f8fafc;border-radius:8px;padding:7px 9px;">
          <p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;margin:0 0 2px;">Equipamentos</p>
          <p style="font-size:20px;font-weight:700;color:#0f172a;margin:0;line-height:1.1;">${obraTools.length}</p>
        </div>
        <div style="background:#f8fafc;border-radius:8px;padding:7px 9px;">
          <p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;margin:0 0 2px;">Em uso</p>
          <p style="font-size:20px;font-weight:700;color:${isActive ? '#10b981' : '#0f172a'};margin:0;line-height:1.1;">${openSessions.length}</p>
        </div>
      </div>
      ${isOverdue ? `<div style="background:#fef2f2;border-radius:8px;padding:6px 9px;margin-bottom:10px;display:flex;align-items:center;gap:5px;"><span style="font-size:13px;">⚠</span><p style="font-size:11px;font-weight:600;color:#ef4444;margin:0;">${overdueSessions.length} sessão${overdueSessions.length > 1 ? 'ões' : ''} com +7 dias</p></div>` : ''}
    </div>
  `;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.style.cssText = 'width:100%;padding:9px 12px;background:#005EB8;color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.01em;';
  btn.textContent = 'Ver obra →';
  btn.onmouseover = () => { btn.style.background = '#0047a0'; };
  btn.onmouseout  = () => { btn.style.background = '#005EB8'; };
  btn.addEventListener('click', () => {
    window.history.pushState({}, '', `/obras/${obra.id}`);
    setActiveView('obra-detalhe');
  });
  el.appendChild(btn);
  return el;
}

export default function MapaObrasView() {
  const mapNodeRef     = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const { obras = [], tools = [], toolSessions = [], setActiveView } = useStore();

  const { obrasWithCoords, obrasWithoutCoords } = useMemo(() => {
    const mapped = obras.map((obra) => ({ obra, coords: getObraCoords(obra) }));
    return {
      obrasWithCoords:    mapped.filter(({ coords }) => coords),
      obrasWithoutCoords: mapped.filter(({ coords }) => !coords).map(({ obra }) => obra),
    };
  }, [obras]);

  const totalInUse = useMemo(
    () => toolSessions.filter((s) => s.status === 'OPEN').length,
    [toolSessions],
  );

  // ── Map init — StrictMode double-mount guard preserved ──────────
  useEffect(() => {
    const container = mapNodeRef.current;
    if (!container) return;
    if (mapInstanceRef.current) return;
    if (container._leaflet_id) delete container._leaflet_id;

    const map = L.map(container, { center: [39.5, -8.0], zoom: 7, scrollWheelZoom: true });

    // CARTO Voyager: labels latinizados/internacionais. Attribution dupla obrigatória.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    mapInstanceRef.current  = map;
    markersLayerRef.current = markersLayer;
    _mapInitialized = true;

    return () => {
      markersLayer.clearLayers();
      map.remove();
      markersLayerRef.current = null;
      mapInstanceRef.current  = null;
      _mapInitialized = false;
    };
  }, []);

  // ── Markers update ──────────────────────────────────────────────
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    const map          = mapInstanceRef.current;
    if (!markersLayer) return;

    markersLayer.clearLayers();

    obrasWithCoords.forEach(({ obra, coords }) => {
      const { color, obraTools, openSessions, overdueSessions } = getObraState(obra, tools, toolSessions);
      const icon   = createPinIcon(color, obraTools.length);
      const marker = L.marker(coords, { icon });
      marker.bindPopup(
        makePopupEl(obra, obraTools, openSessions, overdueSessions, setActiveView),
        { maxWidth: 240, minWidth: 220 },
      );
      marker.addTo(markersLayer);
    });

    if (map && obrasWithCoords.length > 0) {
      const bounds = L.latLngBounds(obrasWithCoords.map(({ coords }) => coords));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
    }
  }, [obrasWithCoords, tools, toolSessions, setActiveView]);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-[calc(100vh-64px)]">

      {/* Header */}
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Obras</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Localização das obras e última leitura NFC
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end mt-0.5">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 font-medium">
              {obras.length} obra{obras.length !== 1 ? 's' : ''}
            </span>
            {totalInUse > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                {totalInUse} em uso
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Map card */}
      <div className="px-4 md:px-6 pt-4 pb-3">
        <div className="h-[52vh] md:h-[calc(100vh-240px)] min-h-[420px] rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden bg-slate-100 dark:bg-slate-800">
          <div
            ref={mapNodeRef}
            className="h-full w-full"
            aria-label="Mapa de obras"
          />
        </div>
      </div>

      {/* Footer: legenda + disclaimer + obras sem GPS */}
      <div className="px-4 md:px-6 pb-5 pt-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          {LEGEND.map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
              {label}
            </span>
          ))}
          <span className="hidden md:inline ml-auto italic text-slate-400 dark:text-slate-500">
            Última leitura NFC · não é rastreio em tempo real
          </span>
        </div>
        <p className="md:hidden text-xs italic text-slate-400 dark:text-slate-500 mt-1">
          Última leitura NFC · não é rastreio em tempo real
        </p>

        {obrasWithoutCoords.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              Sem GPS:
            </span>
            {obrasWithoutCoords.map((obra) => (
              <span
                key={obra.id}
                className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs border border-amber-200 dark:border-amber-700/40"
              >
                {obra.name || obra.id}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
