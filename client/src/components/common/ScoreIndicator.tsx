import React from 'react';

interface Props {
  score: number; // 0 to 100
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreIndicator: React.FC<Props> = ({ score, label, size = 'md' }) => {
  const getColor = (s: number) => {
    if (s >= 80) return { bar: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50' };
    if (s >= 60) return { bar: 'bg-blue-600', text: 'text-blue-700', bg: 'bg-blue-50' };
    if (s >= 40) return { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' };
    return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' };
  };

  const { bar, text, bg } = getColor(score);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold font-tabular px-1.5 py-0.5 rounded ${bg} ${text}`}>
            {score}/100
          </span>
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
        />
      </div>
    </div>
  );
};

