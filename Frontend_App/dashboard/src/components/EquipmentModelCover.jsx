import React, { useState } from 'react';
import {
  Cog, Construction, Drill, Gauge, Hammer, Package, Ruler, Wrench, Zap,
} from 'lucide-react';

const VISUALS = [
  {
    keys: ['parafusadora', 'berbequim', 'ddf', 'drill'],
    label: 'Parafusadora',
    Icon: Drill,
    image: commonsFile('Makita 18v electric drill.jpg'),
    bg: 'from-slate-950 via-sky-900 to-cyan-600',
    ring: 'bg-cyan-300/25',
  },
  {
    keys: ['martelo', 'pneumatico', 'gsh', 'te 2000'],
    label: 'Martelo',
    Icon: Hammer,
    image: commonsFile('Bosch GBH2-26 professional Rotary Hammer Drill PICT4578.jpg'),
    bg: 'from-stone-950 via-orange-900 to-amber-500',
    ring: 'bg-amber-300/25',
  },
  {
    keys: ['perfurador', 'sds', 'te 70', 'te 60'],
    label: 'Perfurador',
    Icon: Drill,
    image: commonsFile('Bosch GBH2-26 professional Rotary Hammer Drill PICT4578.jpg'),
    bg: 'from-red-950 via-rose-800 to-orange-500',
    ring: 'bg-red-300/25',
  },
  {
    keys: ['rebarbadora', 'gws', 'dwe4120'],
    label: 'Rebarbadora',
    Icon: Cog,
    image: commonsFile('Makita GA9050 Angle Grinder.jpg'),
    bg: 'from-zinc-950 via-slate-700 to-zinc-500',
    ring: 'bg-zinc-200/25',
  },
  {
    keys: ['serra', 'circular', 'dwe575', 'dhs680'],
    label: 'Serra',
    Icon: Construction,
    image: commonsFile('Circular saw.jpg'),
    bg: 'from-yellow-950 via-amber-800 to-yellow-500',
    ring: 'bg-yellow-200/25',
  },
  {
    keys: ['lixadora', 'gex'],
    label: 'Lixadora',
    Icon: Wrench,
    image: commonsFile('Random orbit sander.jpg'),
    bg: 'from-blue-950 via-indigo-800 to-sky-500',
    ring: 'bg-blue-200/25',
  },
  {
    keys: ['laser', 'nivelador', 'grl', 'rugby'],
    label: 'Laser',
    Icon: Ruler,
    image: commonsFile('Laser-Level.jpg'),
    bg: 'from-emerald-950 via-teal-800 to-lime-500',
    ring: 'bg-lime-200/25',
  },
  {
    keys: ['gerador', 'honda', 'eu22', 'eu70'],
    label: 'Gerador',
    Icon: Zap,
    image: commonsFile('Generator.jpg'),
    bg: 'from-neutral-950 via-emerald-900 to-green-500',
    ring: 'bg-green-200/25',
  },
  {
    keys: ['compactador', 'placa', 'bomag', 'wacker'],
    label: 'Compactador',
    Icon: Gauge,
    image: commonsFile('Plate compactor.jpg'),
    bg: 'from-stone-950 via-stone-700 to-orange-600',
    ring: 'bg-orange-200/25',
  },
  {
    keys: ['compressor', 'xams', 'atlas copco'],
    label: 'Compressor',
    Icon: Gauge,
    image: commonsFile('Single Stage Portable Air Compressor.jpg'),
    bg: 'from-stone-950 via-slate-700 to-cyan-600',
    ring: 'bg-cyan-200/25',
  },
  {
    keys: ['aspirador', 'aspi', 'gas 25', 'vacuum'],
    label: 'Aspirador',
    Icon: Package,
    image: commonsFile('Craftsman 16 Gallon Wet-Dry Vac.jpg'),
    bg: 'from-slate-950 via-slate-700 to-blue-500',
    ring: 'bg-blue-200/25',
  },
  {
    keys: ['betoneira', 'syntesi', 'concrete mixer'],
    label: 'Betoneira',
    Icon: Construction,
    image: commonsFile('Concrete mixer.jpg'),
    bg: 'from-slate-950 via-cyan-900 to-blue-500',
    ring: 'bg-cyan-200/25',
  },
  {
    keys: ['cortadora', 'azulejo', 'tile saw', 'tile cutter', 'dc-250'],
    label: 'Cortadora',
    Icon: Construction,
    image: commonsFile('Tile saw.jpg'),
    bg: 'from-slate-950 via-orange-900 to-amber-500',
    ring: 'bg-amber-200/25',
  },
  {
    keys: ['vibrador', 'betao', 'betão'],
    label: 'Vibrador de Betão',
    Icon: Construction,
    image: commonsFile('Concrete vibrator.jpg'),
    bg: 'from-slate-950 via-cyan-900 to-blue-500',
    ring: 'bg-cyan-200/25',
  },
];

function commonsFile(filename) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=560`;
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function pickVisual(model) {
  const text = normalize([
    model?.displayName,
    model?.brand,
    model?.modelCode,
    model?.category,
  ].join(' '));

  return VISUALS.find(visual => visual.keys.some(key => text.includes(normalize(key)))) || {
    label: model?.category || 'Equipamento',
    Icon: Package,
    bg: 'from-slate-950 via-slate-800 to-primary-600',
    ring: 'bg-white/20',
  };
}

export default function EquipmentModelCover({ model, compact = false, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const visual = pickVisual(model);
  const Icon = visual.Icon;
  const title = model?.displayName || model?.name || visual.label;

  if (visual.image && !imageFailed) {
    return (
      <div className={`relative h-full w-full overflow-hidden bg-slate-200 ${className}`}>
        <img
          src={visual.image}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
        <div className={`absolute ${compact ? 'inset-0 flex items-end p-1.5' : 'inset-x-0 bottom-0 p-3'}`}>
          <div className={compact ? 'hidden' : 'min-w-0'}>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-900 shadow-sm">
                {model?.brand || visual.label}
              </span>
              {model?.modelCode && (
                <span className="rounded-full border border-white/30 bg-black/25 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                  {model.modelCode}
                </span>
              )}
            </div>
            <p className="mt-1 line-clamp-1 text-sm font-black leading-tight text-white drop-shadow-sm">
              {visual.label}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-br ${visual.bg} ${className}`}>
      <div className={`absolute -right-10 -top-12 h-36 w-36 rounded-full ${visual.ring}`} />
      <div className={`absolute -bottom-14 -left-12 h-44 w-44 rounded-full ${visual.ring}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.20),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.12)_0,transparent_38%)]" />

      <div className={`relative z-10 flex h-full ${compact ? 'items-center justify-center p-2' : 'flex-col justify-between p-4'}`}>
        <div className={compact ? 'hidden' : 'flex items-center justify-between gap-2'}>
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-900 shadow-sm">
            {model?.brand || 'CASAIS'}
          </span>
          {model?.modelCode && (
            <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur">
              {model.modelCode}
            </span>
          )}
        </div>

        <div className={compact ? '' : 'space-y-3'}>
          <div className={`${compact ? 'h-9 w-9' : 'h-14 w-14'} rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-inner`}>
            <Icon className={`${compact ? 'h-5 w-5' : 'h-8 w-8'} text-white`} />
          </div>
          {!compact && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">{visual.label}</p>
              <p className="mt-1 line-clamp-2 text-lg font-black leading-tight text-white drop-shadow-sm">
                {title}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
