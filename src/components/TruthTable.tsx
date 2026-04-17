import React from 'react';
import { CellValue, getGrayCode } from '../lib/KMapLogic';
import { cn } from '../lib/utils';

interface TruthTableProps {
  data: CellValue[];
  varCount: number;
  isSOP: boolean;
}

export const TruthTable: React.FC<TruthTableProps> = ({ data, varCount, isSOP }) => {
  const vars = ['A', 'B', 'C', 'D'].slice(0, varCount);
  const activeIndices = data
    .map((val, idx) => (val === (isSOP ? 1 : 0) ? idx : -1))
    .filter(idx => idx !== -1);
  
  const mNotation = isSOP ? `Σm(${activeIndices.join(', ')})` : `ΠM(${activeIndices.join(', ')})`;
  
  return (
    <div className="w-full overflow-hidden rounded-3xl border border-[var(--border-color)] bg-white shadow-sm max-w-2xl mx-auto">
      <div className="p-4 bg-[var(--sidebar-bg)] border-b border-[var(--border-color)] flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Truth Table</h3>
          <div className="text-[10px] font-mono font-bold text-[var(--accent-olive)]">
            {mNotation}
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{data.length} ROWS</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] text-left font-mono border-collapse bg-white">
          <thead className="bg-slate-50 text-[var(--foreground)] sticky top-0 shadow-sm z-10">
            <tr>
              <th className="px-2 py-2 font-bold text-center border-b border-[var(--border-color)] border-r border-[var(--border-color)] opacity-30 w-12">#</th>
              {vars.map(v => (
                <th key={v} className="px-1 py-2 font-bold text-center border-b border-[var(--border-color)] border-r border-[var(--border-color)] opacity-60">
                  {v}
                </th>
              ))}
              <th className="px-1 py-2 font-bold text-center border-b border-[var(--border-color)] text-[var(--accent-olive)] bg-[var(--sidebar-bg)]">F</th>
            </tr>
          </thead>
          <tbody>
            {data.map((val, idx) => {
              const binary = idx.toString(2).padStart(varCount, '0');
              const bits = binary.split('');
              const isActive = val === (isSOP ? 1 : 0);
              
              return (
                <tr key={idx} className={cn(
                  "group border-b border-[var(--border-color)] last:border-b-0 hover:bg-slate-50 transition-colors",
                  isActive && "bg-slate-50/50"
                )}>
                  <td className="px-2 py-1 text-center border-r border-[var(--border-color)] text-[9px] opacity-20 font-bold">{idx}</td>
                  {bits.map((bit, i) => (
                    <td key={i} className="px-1 py-1 text-center border-r border-[var(--border-color)] opacity-40 group-hover:opacity-100">
                      {bit}
                    </td>
                  ))}
                  <td className={cn(
                    "px-1 py-1 text-center font-bold text-sm",
                    val === 1 ? "text-[var(--accent-olive)] bg-green-50/30" : 
                    val === 'X' ? "text-[var(--accent-sage)] bg-amber-50/20" : 
                    "text-slate-300"
                  )}>
                    {val}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
