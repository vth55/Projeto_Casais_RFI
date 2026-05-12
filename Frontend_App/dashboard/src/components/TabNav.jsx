import React from 'react';

const TabNav = ({ tabs, activeTab, onChange, scrollable = false }) => (
  <div className={`flex border-b border-slate-200 dark:border-slate-700 ${scrollable ? 'overflow-x-auto' : ''}`}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`${scrollable ? 'flex-shrink-0' : ''} px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === tab.id
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
      >
        {tab.label}
        {tab.count !== undefined && tab.count > 0 && (
          <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
            activeTab === tab.id
              ? 'bg-primary-100 text-primary-700'
              : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400'
          }`}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

export default TabNav;
