import React from 'react';

const StatusBadge = ({ status }) => {
  let style = 'bg-slate-100 text-slate-600 border-slate-200';
  let text = status;
  if (status === 'ACTIVE' || status === 'OPEN') {
    text = 'EM OPERAÇÃO';
    style = 'bg-primary-50 text-primary-700 border-primary-100';
  } else if (status === 'CLOSED') {
    text = 'PARADO';
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${style}`}>{text}</span>
  );
};
export default StatusBadge;
