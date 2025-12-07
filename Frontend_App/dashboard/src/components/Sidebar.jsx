import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { navigationStructure } from '../config/navigation';
import CasaisLogo from './CasaisLogo';

const Sidebar = ({ activeView, onNavigate }) => {
  const [expandedMenu, setExpandedMenu] = useState(() => {
    for (const item of navigationStructure) {
      if (item.submenu && item.submenu.some((sub) => sub.id === activeView)) {
        return item.id;
      }
      if (item.id === activeView && item.submenu) {
        return item.id;
      }
    }
    return null;
  });

  const toggleMenu = (menuId) => {
    setExpandedMenu((prev) => (prev === menuId ? null : menuId));
  };

  const isMenuExpanded = (menuId) => expandedMenu === menuId;
  
  useEffect(() => {
    for (const item of navigationStructure) {
      if (item.submenu && item.submenu.some((sub) => sub.id === activeView)) {
        setExpandedMenu(item.id);
        return;
      }
    }
  }, [activeView]);
  
  const isActive = (viewId) => activeView === viewId;

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 flex flex-col hidden md:flex z-20 shadow-2xl">
      <div className="p-6 pb-4 border-b border-slate-700">
        <CasaisLogo size="lg" showSubtitle={true} />
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navigationStructure.map((item) => {
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isExpanded = isMenuExpanded(item.id);
          const isItemActive =
            isActive(item.id) || (hasSubmenu && item.submenu.some((sub) => isActive(sub.id)));

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasSubmenu) {
                    toggleMenu(item.id);
                  } else {
                    onNavigate(item.id);
                  }
                }}
                className={`group relative w-full flex items-center justify-between px-4 py-3.5 rounded-lg transition-all duration-300 ${
                  isItemActive
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/50'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                {isItemActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                )}

                <div className="flex items-center gap-3 flex-1">
                  <item.icon
                    className={`w-5 h-5 transition-transform duration-300 ${
                      isItemActive
                        ? 'text-white scale-110'
                        : 'text-slate-400 group-hover:text-white group-hover:scale-110'
                    }`}
                  />
                  <div className="flex-1 text-left">
                    <span
                      className={`font-semibold text-sm block ${
                        isItemActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                      }`}
                    >
                      {item.label}
                    </span>
                    {!hasSubmenu && (
                      <span className="text-xs text-slate-400 group-hover:text-slate-300 block mt-0.5">
                        {item.description}
                      </span>
                    )}
                  </div>
                </div>

                {hasSubmenu && (
                  <div className="ml-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                )}
              </button>

              {hasSubmenu && isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-700 pl-4">
                  {item.submenu.map((subItem) => {
                    const isSubActive = isActive(subItem.id);
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => onNavigate(subItem.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                          isSubActive
                            ? 'bg-primary-500/20 text-primary-300 border-l-2 border-primary-500'
                            : 'text-slate-400 hover:bg-slate-700/30 hover:text-slate-200'
                        }`}
                      >
                        <subItem.icon className="w-4 h-4" />
                        <span className="font-medium">{subItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-5 border-t border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-sm font-bold text-white shadow-lg ring-2 ring-primary-400/50">
            VH
          </div>
          <div>
            <p className="text-sm font-bold text-white">Vitor Hugo</p>
            <p className="text-xs text-slate-400">Engenharia</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
