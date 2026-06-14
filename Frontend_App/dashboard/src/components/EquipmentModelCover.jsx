import React from 'react';
import {
  Cog, Construction, Drill, Gauge, Hammer, Package, Ruler, Wrench, Zap,
} from 'lucide-react';

const VISUALS = [
  {
    keys: ['parafusadora', 'berbequim', 'ddf', 'drill'],
    label: 'Parafusadora',
    Icon: Drill,
    bg: 'from-slate-950 via-sky-900 to-cyan-600',
    ring: 'bg-cyan-300/25',
  },
  {
    keys: ['martelo', 'pneumatico', 'gsh', 'te 2000'],
    label: 'Martelo',
    Icon: Hammer,
    bg: 'from-stone-950 via-orange-900 to-amber-500',
    ring: 'bg-amber-300/25',
  },
  {
    keys: ['perfurador', 'sds', 'te 70', 'te 60'],
    label: 'Perfurador',
    Icon: Drill,
    bg: 'from-red-950 via-rose-800 to-orange-500',
    ring: 'bg-red-300/25',
  },
  {
    keys: ['rebarbadora', 'gws', 'dwe4120'],
    label: 'Rebarbadora',
    Icon: Cog,
    bg: 'from-zinc-950 via-slate-700 to-zinc-500',
    ring: 'bg-zinc-200/25',
  },
  {
    keys: ['serra', 'circular', 'dwe575', 'dhs680'],
    label: 'Serra',
    Icon: Construction,
    bg: 'from-yellow-950 via-amber-800 to-yellow-500',
    ring: 'bg-yellow-200/25',
  },
  {
    keys: ['lixadora', 'gex'],
    label: 'Lixadora',
    Icon: Wrench,
    bg: 'from-blue-950 via-indigo-800 to-sky-500',
    ring: 'bg-blue-200/25',
  },
  {
    keys: ['laser', 'nivelador', 'grl', 'rugby'],
    label: 'Laser',
    Icon: Ruler,
    bg: 'from-emerald-950 via-teal-800 to-lime-500',
    ring: 'bg-lime-200/25',
  },
  {
    keys: ['gerador', 'honda', 'eu22', 'eu70'],
    label: 'Gerador',
    Icon: Zap,
    bg: 'from-neutral-950 via-emerald-900 to-green-500',
    ring: 'bg-green-200/25',
  },
  {
    keys: ['compactador', 'placa', 'bomag', 'wacker'],
    label: 'Compactador',
    Icon: Gauge,
    bg: 'from-stone-950 via-stone-700 to-orange-600',
    ring: 'bg-orange-200/25',
  },
  {
    keys: ['betoneira', 'vibrador', 'betao', 'betão', 'cortadora'],
    label: 'Obra',
    Icon: Construction,
    bg: 'from-slate-950 via-cyan-900 to-blue-500',
    ring: 'bg-cyan-200/25',
  },
];

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
  const visual = pickVisual(model);
  const Icon = visual.Icon;
  const title = model?.displayName || model?.name || visual.label;

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
