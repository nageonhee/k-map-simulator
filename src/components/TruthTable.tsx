import React from 'react';
import { CellValue, getGrayCode } from '../lib/KMapLogic';
import { cn } from '../lib/utils';

interface TruthTableProps {
  data: CellValue[];
  varCount: number;
  isSOP: boolean;
}

export const TruthTable: React.FC<TruthTableProps> = ({ data, varCount, isSOP }) => {
  const effectiveVarCount = Math.min(varCount, 5);
  const vars = ['A', 'B', 'C', 'D', 'E'].slice(0, effectiveVarCount);
  const dataSliced = data.slice(0, Math.pow(2, effectiveVarCount));
  const mintermIndices = dataSliced
    .map((val, idx) => (val === 1 ? idx : -1))
    .filter(idx => idx !== -1);
  const maxtermIndices = dataSliced
    .map((val, idx) => (val === 0 ? idx : -1))
    .filter(idx => idx !== -1);
  
  const mNotation = `Σm(${mintermIndices.join(', ')})`;
  const MNotation = `ΠM(${maxtermIndices.join(', ')})`;
  
  return (
    <div className="w-full overflow-hidden rounded-3xl border border-[var(--border-color)] bg-white shadow-sm max-w-2xl mx-auto">
      <div className="p-4 bg-[var(--sidebar-bg)] border-b border-[var(--border-color)] flex flex-wrap gap-4 justify-between items-center">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Logic Notation</h3>
          <div className="flex flex-col gap-1">
            <div className="text-[10px] font-mono font-bold text-[var(--accent-olive)] flex items-center gap-2">
              <span className="opacity-50">SOP:</span> {mNotation}
            </div>
            <div className="text-[10px] font-mono font-bold text-[var(--accent-olive)] flex items-center gap-2">
              <span className="opacity-50">POS:</span> {MNotation}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{dataSliced.length} ROWS</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] text-left font-mono border-collapse bg-white">
          <thead className="bg-slate-50 text-[var(--foreground)] sticky top-0 shadow-sm z-10">
            <tr>
              {vars.map(v => (
                <th key={v} className="px-1 py-2 font-bold text-center border-b border-[var(--border-color)] border-r border-[var(--border-color)] opacity-60 w-14">
                  {v}
                </th>
              ))}
              <th className="px-1 py-2 font-bold text-center border-b border-[var(--border-color)] text-[var(--accent-olive)] bg-[var(--sidebar-bg)] w-14">F</th>
            </tr>
          </thead>
          <tbody>
            {dataSliced.map((val, idx) => {
              const binary = idx.toString(2).padStart(effectiveVarCount, '0');
              const bits = binary.split('');
              const isMinterm = val === 1;
              const isMaxterm = val === 0;
              
              return (
                <tr key={idx} className={cn(
                  "group border-b border-[var(--border-color)] last:border-b-0 hover:bg-slate-50 transition-colors",
                  (isMinterm || isMaxterm) && "bg-slate-50/50"
                )}>
                  {bits.map((bit, i) => (
                    <td key={i} className="px-1 py-1 text-center border-r border-[var(--border-color)] opacity-40 group-hover:opacity-100 w-14">
                      {bit}
                    </td>
                  ))}
                  <td className={cn(
                    "px-1 py-1 text-center font-bold text-sm w-14",
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
