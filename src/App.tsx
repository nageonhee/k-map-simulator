/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CellValue, 
  KMapGroup, 
  getGrayCode, 
  findPrimeImplicants, 
  simplifyExpression 
} from './lib/KMapLogic';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Settings2, Calculator, Grid3X3, Info, Table as TableIcon, Cpu, List } from 'lucide-react';
import { cn } from './lib/utils';
import { TruthTable } from './components/TruthTable';
import { CircuitDiagram } from './components/CircuitDiagram';

export default function App() {
  const [varCount, setVarCount] = useState<2 | 3 | 4 | 5>(4);
  const [data, setData] = useState<CellValue[]>(new Array(16).fill(0));
  const [activeTab, setActiveTab] = useState<'sop' | 'pos'>('sop');
  const [activeView, setActiveView] = useState<'expression' | 'truthTable' | 'circuit'>('expression');
  const [termType, setTermType] = useState<'minterm' | 'maxterm'>('minterm');
  const [activeInputSource, setActiveInputSource] = useState<'manual' | 'minmax' | 'expression'>('manual');

  const handleCellClick = (index: number) => {
    const newData = [...data];
    // Cycle: 0 -> 1 -> X -> 0
    if (newData[index] === 0) newData[index] = 1;
    else if (newData[index] === 1) newData[index] = 'X';
    else newData[index] = 0;
    
    setData(newData);
    setActiveInputSource('manual');
  };

  const handleVarCountChange = (count: number) => {
    const c = count as 2 | 3 | 4 | 5;
    setVarCount(c);
    setData(new Array(Math.pow(2, c)).fill(0));
    setActiveInputSource('manual');
  };

  const applyMinterms = (value: string) => {
    const matches = value.match(/\d+/g);
    const newData = new Array(Math.pow(2, varCount)).fill(termType === 'minterm' ? 0 : 1);
    const target = termType === 'minterm' ? 1 : 0;
    if (matches) {
      matches.map(m => parseInt(m)).forEach(idx => {
        if (idx >= 0 && idx < newData.length) newData[idx] = target;
      });
    }
    setData(newData);
    if (!value && activeInputSource === 'minmax') setActiveInputSource('manual');
    else if (value) setActiveInputSource('minmax');
  };

  const applyExpression = (expr: string) => {
    const newData = new Array(Math.pow(2, varCount)).fill(0) as CellValue[];
    if (!expr || expr.trim() === '') {
      setData(newData);
      if (activeInputSource === 'expression') setActiveInputSource('manual');
      return;
    }

    const evaluateBoolean = (expr: string, context: Record<string, boolean>): boolean => {
      // 1. Clean and normalize
      let clean = expr.toUpperCase().replace(/\s+/g, '');
      clean = clean.replace(/•/g, '&'); // Replace dot with AND
      clean = clean.replace(/\+/g, '|'); // Replace plus with OR
      
      // 2. Handle juxtaposition (AB -> A&B)
      let processed = "";
      for (let i = 0; i < clean.length; i++) {
        const char = clean[i];
        processed += char;
        if (i < clean.length - 1) {
          const next = clean[i + 1];
          // Operands: A-E, ), '
          // Starts: A-E, (
          const isCurrTermEnd = /[A-E)]/.test(char) || char === "'";
          const isNextTermStart = /[A-E(]/.test(next);
          if (isCurrTermEnd && isNextTermStart) {
            processed += '&';
          }
        }
      }

      // 3. Handle NOT (') - Convert X' to !X and (...)' to !(...)
      while (processed.includes("'")) {
        const idx = processed.indexOf("'");
        if (processed[idx - 1] === ')') {
          let depth = 0;
          let j = idx - 1;
          while (j >= 0) {
            if (processed[j] === ')') depth++;
            else if (processed[j] === '(') depth--;
            if (depth === 0) break;
            j--;
          }
          if (j < 0) j = 0;
          processed = processed.substring(0, j) + "!" + processed.substring(j, idx) + processed.substring(idx + 1);
        } else {
          processed = processed.substring(0, idx - 1) + "!" + processed[idx - 1] + processed.substring(idx + 1);
        }
      }

      // 4. Substitute values
      let finalExpr = processed;
      // Replace only whole words to avoid A in "FALSE"
      finalExpr = finalExpr.replace(/A/g, context.A ? '1' : '0');
      finalExpr = finalExpr.replace(/B/g, context.B ? '1' : '0');
      finalExpr = finalExpr.replace(/C/g, context.C ? '1' : '0');
      finalExpr = finalExpr.replace(/D/g, context.D ? '1' : '0');
      finalExpr = finalExpr.replace(/E/g, context.E ? '1' : '0');
      
      // 5. Final JS conversion
      finalExpr = finalExpr.replace(/&/g, '&&').replace(/\|/g, '||').replace(/1/g, 'true').replace(/0/g, 'false');
      
      try {
        // Use Function instead of eval for cleaner scoped evaluation
        return !!(new Function(`return (${finalExpr})`)());
      } catch (e) {
        return false;
      }
    };

    for (let i = 0; i < newData.length; i++) {
      const binary = i.toString(2).padStart(varCount, '0');
      const context = {
        A: binary[0] === '1',
        B: binary[1] === '1',
        C: varCount >= 3 ? binary[2] === '1' : false,
        D: varCount >= 4 ? binary[3] === '1' : false,
        E: varCount === 5 ? binary[4] === '1' : false,
      };
      
      if (evaluateBoolean(expr, context)) {
        newData[i] = 1;
      }
    }
    setData(newData);
    setActiveInputSource('expression');
  };

  const sopGroups = useMemo(() => findPrimeImplicants(data.slice(0, Math.pow(2, varCount)), varCount, 1), [data, varCount]);
  const posGroups = useMemo(() => findPrimeImplicants(data.slice(0, Math.pow(2, varCount)), varCount, 0), [data, varCount]);

  const sopExpression = useMemo(() => simplifyExpression(sopGroups, true), [sopGroups]);
  const posExpression = useMemo(() => simplifyExpression(posGroups, false), [posGroups]);

  const currentGroups = activeTab === 'sop' ? sopGroups : posGroups;

  // Grid configuration
  const rowBits = varCount === 5 ? 2 : (varCount === 4 ? 2 : 1);
  const colBits = varCount === 5 ? 2 : (varCount >= 3 ? 2 : 1);
  const rowGray = getGrayCode(rowBits);
  const colGray = getGrayCode(colBits);

  const getIndex = (r: number, c: number, gridIdx: number = 0) => {
    // 5비트(0-31) 범위로 절대적으로 제한
    if (varCount === 5) {
      const g = (gridIdx & 1) << 4;
      const row = (rowGray[r] & 3) << 2;
      const col = (colGray[c] & 3);
      return (g | row | col) & 0x1F;
    }
    if (varCount === 4) return ((rowGray[r] & 3) << 2) | (colGray[c] & 3);
    if (varCount === 3) return ((rowGray[r] & 1) << 2) | (colGray[c] & 3);
    return ((rowGray[r] & 1) << 1) | (colGray[c] & 1);
  };

  const getCellColors = (index: number) => {
    return currentGroups
      .filter(g => g.cells.includes(index))
      .map(g => g.color);
  };

  // Helper to get (r, c, grid) from index
  const getCoords = (index: number) => {
    const gridIdx = varCount === 5 ? (index >> 4) : 0;
    const localIdx = varCount === 5 ? (index & 15) : index;
    
    for (let r = 0; r < rowGray.length; r++) {
      for (let c = 0; c < colGray.length; c++) {
        if (getIndex(r, c, gridIdx) === index) return { r, c, gridIdx };
      }
    }
    return { r: 0, c: 0, gridIdx: 0 };
  };

  const renderTerm = (term: string) => {
    const elements: React.ReactElement[] = [];
    for (let i = 0; i < term.length; i++) {
      if (term[i] === '(' || term[i] === ')' || term[i] === ' ' || term[i] === '+' || term[i] === '•') {
        elements.push(<span key={i}>{term[i]}</span>);
        continue;
      }
      if (i + 1 < term.length && term[i + 1] === "'") {
        elements.push(
          <span key={i} className="inline-block overline decoration-current decoration-2 mr-0.5 last:mr-0 pr-[1px]">
            {term[i]}
          </span>
        );
        i++;
      } else {
        elements.push(<span key={i} className="inline-block pr-[1px]">{term[i]}</span>);
      }
    }
    return elements;
  };

  const renderLoops = (targetGrid: number = 0) => {
    const cellSize = 80; // 5rem = 80px
    return (
      <svg className="absolute inset-0 pointer-events-none z-20 overflow-visible" width={colGray.length * cellSize} height={rowGray.length * cellSize}>
        {currentGroups.map((group, gIdx) => {
          // Only show cells in the current grid (for 5-var mode)
          const gridCells = group.cells.filter(idx => (varCount === 5 ? (idx >> 4) : 0) === targetGrid);
          if (gridCells.length === 0) return null;

          const coords: any[] = gridCells.map(idx => getCoords(idx));
          const rows: number[] = Array.from(new Set(coords.map(p => p.r))).sort((a, b) => a - b);
          const cols: number[] = Array.from(new Set(coords.map(p => p.c))).sort((a, b) => a - b);
          
          const minR = rows[0] ?? 0;
          const maxR = rows[rows.length - 1] ?? 0;
          const minC = cols[0] ?? 0;
          const maxC = cols[cols.length - 1] ?? 0;
          
          const isRowWrap = rows.length > 1 && (maxR - minR) !== rows.length - 1;
          const isColWrap = cols.length > 1 && (maxC - minC) !== cols.length - 1;

          const drawPath = (d: string, key: string) => (
            <motion.path
              key={key}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              d={d}
              fill="none"
              stroke={group.color.replace('0.4', '0.8')}
              strokeWidth="3"
              strokeDasharray="5,5"
              className="drop-shadow-sm"
            />
          );

          const getPath = (r: number, c: number, h: number, w: number, open?: 'left' | 'right' | 'top' | 'bottom') => {
            const x = c * cellSize;
            const y = r * cellSize;
            const width = w * cellSize;
            const height = h * cellSize;
            const padding = 12;
            const loopRadius = 24; // Fixed corner radius for professional look

            if (!open) {
              const x1 = x + padding;
              const y1 = y + padding;
              const w1 = width - 2 * padding;
              const h1 = height - 2 * padding;
              const rv = Math.min(loopRadius, w1 / 2, h1 / 2);
              return `M ${x1 + rv} ${y1} h ${w1 - 2*rv} a ${rv} ${rv} 0 0 1 ${rv} ${rv} v ${h1 - 2*rv} a ${rv} ${rv} 0 0 1 -${rv} ${rv} h -${w1 - 2*rv} a ${rv} ${rv} 0 0 1 -${rv} -${rv} v -${h1 - 2*rv} a ${rv} ${rv} 0 0 1 ${rv} -${rv} Z`;
            }

            // Wrapping shapes (Bracket style to enclose numbers)
            const depth = cellSize * 0.85; // How far the loop reaches into the cell
            const yTop = y + padding;
            const yBottom = y + height - padding;
            const xLeft = x + padding;
            const xRight = x + width - padding;

            if (open === 'right') { 
              const innerX = x + width - depth;
              const rv = Math.min(loopRadius, (yBottom - yTop) / 2);
              return `M ${x + width} ${yTop} H ${innerX + rv} a ${rv} ${rv} 0 0 0 -${rv} ${rv} v ${yBottom - yTop - 2*rv} a ${rv} ${rv} 0 0 0 ${rv} ${rv} H ${x + width}`;
            }
            if (open === 'left') {
              const innerX = x + depth;
              const rv = Math.min(loopRadius, (yBottom - yTop) / 2);
              return `M ${x} ${yTop} H ${innerX - rv} a ${rv} ${rv} 0 0 1 ${rv} ${rv} v ${yBottom - yTop - 2*rv} a ${rv} ${rv} 0 0 1 -${rv} ${rv} H ${x}`;
            }
            if (open === 'bottom') {
              const innerY = y + height - depth;
              const rv = Math.min(loopRadius, (xRight - xLeft) / 2);
              return `M ${xLeft} ${y + height} V ${innerY + rv} a ${rv} ${rv} 0 0 1 ${rv} -${rv} h ${xRight - xLeft - 2*rv} a ${rv} ${rv} 0 0 1 ${rv} ${rv} V ${y + height}`;
            }
            if (open === 'top') {
              const innerY = y + depth;
              const rv = Math.min(loopRadius, (xRight - xLeft) / 2);
              return `M ${xLeft} ${y} V ${innerY - rv} a ${rv} ${rv} 0 0 0 ${rv} ${rv} h ${xRight - xLeft - 2*rv} a ${rv} ${rv} 0 0 0 ${rv} -${rv} V ${y}`;
            }
            return "";
          };

          // 4-Corner Case (Deep arcs to enclose numbers)
          if (isRowWrap && isColWrap && rows.length === 2 && cols.length === 2) {
            const d = cellSize * 0.85; // Depth
            const w = colGray.length * cellSize;
            const h = rowGray.length * cellSize;
            
            return [
              // Top-left (0,0): Arc around the value
              drawPath(`M 0 ${d} A ${d} ${d} 0 0 0 ${d} 0`, `loop-${gIdx}-c1`),
              // Top-right (0, max)
              drawPath(`M ${w} ${d} A ${d} ${d} 0 0 1 ${w - d} 0`, `loop-${gIdx}-c2`),
              // Bottom-left (max, 0)
              drawPath(`M 0 ${h - d} A ${d} ${d} 0 0 1 ${d} ${h}`, `loop-${gIdx}-c3`),
              // Bottom-right (max, max)
              drawPath(`M ${w} ${h - d} A ${d} ${d} 0 0 0 ${w - d} ${h}`, `loop-${gIdx}-c4`),
            ];
          }

          // Simple logic for non-wrapping groups
          if (!isRowWrap && !isColWrap) {
            return drawPath(getPath(minR, minC, rows.length, cols.length), `loop-${gIdx}`);
          }

          // Handle wrapping
          const elements: any[] = [];
          if (isColWrap) {
            const leftCols = cols.filter((c: number) => c < colGray.length / 2);
            const rightCols = cols.filter((c: number) => c >= colGray.length / 2);
            if (leftCols.length > 0) elements.push(drawPath(getPath(minR, leftCols[0], rows.length, leftCols.length, 'left'), `loop-${gIdx}-cl`));
            if (rightCols.length > 0) elements.push(drawPath(getPath(minR, rightCols[0], rows.length, rightCols.length, 'right'), `loop-${gIdx}-cr`));
          } else if (isRowWrap) {
            const topRows = rows.filter((r: number) => r < rowGray.length / 2);
            const botRows = rows.filter((r: number) => r >= rowGray.length / 2);
            if (topRows.length > 0) elements.push(drawPath(getPath(topRows[0], minC, topRows.length, cols.length, 'top'), `loop-${gIdx}-rt`));
            if (botRows.length > 0) elements.push(drawPath(getPath(botRows[0], minC, botRows.length, cols.length, 'bottom'), `loop-${gIdx}-rb`));
          }

          return elements;
        })}
      </svg>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
      {/* Sidebar */}
      <aside className="w-full lg:w-[280px] bg-[var(--sidebar-bg)] border-b lg:border-b-0 lg:border-r border-[var(--border-color)] p-6 lg:px-8 lg:py-7 flex flex-col gap-6 lg:gap-8 shrink-0">
        <div>
          <h1 className="font-serif italic text-2xl text-[var(--accent-olive)] mb-2">K-Map Simulator</h1>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Boolean logic minimization tool with real-time grouping visualization.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase font-semibold tracking-widest text-[var(--text-muted)]">Number of Variables</span>
          <div className="flex gap-2">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => handleVarCountChange(n)}
                className={cn(
                  "flex-1 py-2.5 border border-[var(--border-color)] rounded-lg text-sm transition-all duration-200",
                  varCount === n 
                    ? "bg-[var(--accent-olive)] text-white border-[var(--accent-olive)]" 
                    : "bg-white hover:bg-[var(--cell-active)]"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase font-semibold tracking-widest text-[var(--text-muted)]">Manual Edit Guide</span>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed px-1">
            Click cells to cycle values:<br/>
            <span className="font-bold text-[var(--accent-olive)]">0 → 1 → X</span>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase font-semibold tracking-widest text-[var(--text-muted)]">Input Commands</span>
          
          {/* Minterm/Maxterm Input */}
          <div className={cn("space-y-2 transition-opacity", activeInputSource === 'expression' && "opacity-40 pointer-events-none")}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">Terms: {termType === 'minterm' ? 'm' : 'M'}(...)</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setTermType('minterm')}
                  className={cn("px-2 py-0.5 text-[8px] font-bold border rounded-md transition-colors", termType === 'minterm' ? "bg-[var(--accent-olive)] text-white" : "bg-white text-[var(--text-muted)]")}
                >
                  min
                </button>
                <button 
                  onClick={() => setTermType('maxterm')}
                  className={cn("px-2 py-0.5 text-[8px] font-bold border rounded-md transition-colors", termType === 'maxterm' ? "bg-[var(--accent-olive)] text-white" : "bg-white text-[var(--text-muted)]")}
                >
                  max
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input 
                id="minmax-input"
                type="text" 
                placeholder="0, 1, 3, ..." 
                disabled={activeInputSource === 'expression'}
                onChange={(e) => applyMinterms(e.target.value)}
                className={cn(
                  "flex-1 px-3 py-2 text-xs border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent-olive)] bg-white",
                  activeInputSource === 'expression' && "bg-slate-50 cursor-not-allowed"
                )}
              />
            </div>
          </div>

          {/* Expression Input */}
          <div className={cn("space-y-2 mt-4 transition-opacity", activeInputSource === 'minmax' && "opacity-40 pointer-events-none")}>
            <span className="text-[10px] font-bold text-[var(--text-muted)]">Expression Builder</span>
            
            <div className="space-y-1.5">
              <div className="grid grid-cols-5 gap-1 p-1 bg-white border border-[var(--border-color)] rounded-lg text-center">
                {['A', 'B', 'C', 'D', 'E'].slice(0, varCount).map((btn) => (
                  <button
                    key={btn}
                    disabled={activeInputSource === 'minmax'}
                    onClick={() => {
                      const input = document.getElementById('expr-input') as HTMLInputElement;
                      if (!input) return;
                      const start = input.selectionStart || 0;
                      const text = input.value;
                      input.value = text.substring(0, start) + btn + text.substring(input.selectionEnd || 0);
                      applyExpression(input.value);
                      input.focus();
                      input.setSelectionRange(start + 1, start + 1);
                    }}
                    className="py-1.5 text-[10px] font-bold border border-[var(--border-color)] rounded-md hover:bg-[var(--accent-olive)] hover:text-white transition-colors"
                  >
                    {btn}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 border border-[var(--border-color)] rounded-lg">
                {['+', "'", '(', ')'].map((btn) => (
                  <button
                    key={btn}
                    disabled={activeInputSource === 'minmax'}
                    onClick={() => {
                      const input = document.getElementById('expr-input') as HTMLInputElement;
                      if (!input) return;
                      const start = input.selectionStart || 0;
                      const text = input.value;
                      input.value = text.substring(0, start) + btn + text.substring(input.selectionEnd || 0);
                      applyExpression(input.value);
                      input.focus();
                      input.setSelectionRange(start + 1, start + 1);
                    }}
                    className="py-1.5 text-[10px] font-bold border border-[var(--border-color)] rounded-md hover:bg-slate-700 hover:text-white transition-colors bg-white"
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <input 
                id="expr-input"
                type="text" 
                placeholder={varCount === 2 ? "A + B'" : "AB + CD'"} 
                disabled={activeInputSource === 'minmax'}
                onChange={(e) => applyExpression(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent-olive)] bg-white",
                  activeInputSource === 'minmax' && "bg-slate-50 cursor-not-allowed"
                )}
              />
              <Button 
                variant="outline"
                size="sm" 
                className="w-full text-[10px] h-8"
                onClick={() => {
                  const input = document.getElementById('expr-input') as HTMLInputElement;
                  if (input) input.value = '';
                  const mInput = document.getElementById('minmax-input') as HTMLInputElement;
                  if (mInput) mInput.value = '';
                  setData(new Array(Math.pow(2, varCount)).fill(0));
                  setActiveInputSource('manual');
                }}
              >
                Clear All Inputs
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-[var(--border-color)]">
          <p className="text-[10px] text-center text-[var(--text-muted)] italic">
            Minimized logic values are updated in real-time.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-10 flex flex-col gap-8 lg:gap-10 overflow-x-hidden pt-6 lg:pt-10">
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
          {/* Top Toolbar - Responsive positioning */}
          <div className="w-full lg:absolute lg:top-0 lg:right-0 lg:pr-10 z-30 flex flex-col items-center lg:items-end gap-2 mb-8 lg:mb-0">
            <div className="flex flex-wrap justify-center lg:justify-end gap-2 px-4">
              <div className="flex flex-col items-center lg:items-end bg-white/80 backdrop-blur-sm border border-[var(--border-color)] px-3 py-1.5 rounded-lg shadow-sm">
                <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] leading-none mb-1">Groups / Literals</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--accent-olive)]">{currentGroups.length}</span>
                  <span className="w-[1px] h-3 bg-[var(--border-color)]"></span>
                  <span className="text-xs font-bold text-[var(--accent-olive)]">
                    {activeTab === 'sop' ? sopExpression.replace(/[^A-E']/g, '').length : posExpression.replace(/[^A-E']/g, '').length}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">({activeTab.toUpperCase()})</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setData(new Array(Math.pow(2, varCount)).fill(0));
                  setActiveInputSource('manual');
                  const i1 = document.getElementById('expr-input') as HTMLInputElement;
                  const i2 = document.getElementById('minmax-input') as HTMLInputElement;
                  if (i1) i1.value = '';
                  if (i2) i2.value = '';
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[var(--accent-olive)] rounded-lg text-[var(--accent-olive)] text-xs font-bold hover:bg-[var(--accent-olive)] hover:text-white transition-all duration-200 shadow-sm"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                Reset Map
              </button>
            </div>
          </div>

          <div className={cn(
            "relative p-2 sm:p-10 origin-center flex flex-col items-center gap-12 transition-all duration-300",
            varCount === 5 
              ? "lg:flex-row lg:items-start scale-[0.65] min-[400px]:scale-[0.85] sm:scale-100 lg:scale-[0.8] xl:scale-[0.9] lg:mt-6" 
              : "scale-[0.7] min-[400px]:scale-[0.9] sm:scale-100 md:scale-110"
          )}>
            {[0, 1].map((gridIdx) => {
              if (varCount < 5 && gridIdx === 1) return null;
              return (
                <div key={gridIdx} className="relative">
                  {varCount === 5 && (
                    <div className="absolute -top-10 left-0 right-0 text-center font-bold text-[var(--accent-olive)] uppercase tracking-tighter text-sm">
                      {gridIdx === 0 ? "A = 0" : "A = 1"}
                    </div>
                  )}
                  {/* Variable Labels - Positioned in the top-left corner of the table */}
                  <div className="absolute top-0 left-0 w-12 h-12 flex items-center justify-center">
                    <div className="relative font-bold text-xs sm:text-sm text-[var(--accent-olive)] flex flex-col items-center leading-none">
                      <span className="self-end mr-1">{varCount === 2 ? "B" : varCount === 3 ? "BC" : (varCount === 5 ? "DE" : "CD")}</span>
                      <div className="w-10 h-[1.5px] bg-[var(--accent-olive)] opacity-30 rotate-[45deg] my-0.5"></div>
                      <span className="self-start ml-1">{varCount === 2 ? "A" : varCount === 3 ? "A" : (varCount === 5 ? "BC" : "AB")}</span>
                    </div>
                  </div>

                  {/* Column Labels */}
                  <div className="flex ml-12 mb-2 w-fit text-xs sm:text-sm text-[var(--text-muted)] font-medium">
                    {colGray.map(g => (
                      <span key={g} className="w-20 text-center flex-shrink-0">
                        {g.toString(2).padStart(colBits, '0')}
                      </span>
                    ))}
                  </div>

                  <div className="flex">
                    {/* Row Labels */}
                    <div className="flex flex-col justify-around mr-4 text-xs sm:text-sm text-[var(--text-muted)] font-medium w-8">
                      {rowGray.map(g => (
                        <span key={g} className="h-20 flex items-center justify-end">
                          {g.toString(2).padStart(rowBits, '0')}
                        </span>
                      ))}
                    </div>

                    {/* The Grid */}
                    <div 
                      className="grid border-2 border-[var(--accent-olive)] bg-white relative"
                      style={{ 
                        gridTemplateColumns: `repeat(${colGray.length}, 5rem)`,
                        gridTemplateRows: `repeat(${rowGray.length}, 5rem)`
                      }}
                    >
                      {renderLoops(gridIdx)}
                      {rowGray.map((_, r) => (
                        colGray.map((_, c) => {
                          const index = getIndex(r, c, gridIdx);
                          const isOne = data[index] === 1;
                          const isX = data[index] === 'X';
                          return (
                            <motion.button
                              key={`${gridIdx}-${r}-${c}`}
                              whileHover={{ backgroundColor: "var(--cell-active)" }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleCellClick(index)}
                              className={cn(
                                "relative border border-[var(--border-color)] flex items-center justify-center text-xl sm:text-2xl transition-colors",
                                isOne ? "font-extrabold text-[var(--accent-olive)]" : 
                                isX ? "font-bold text-[var(--accent-sage)]" :
                                "text-[var(--border-color)]"
                              )}
                            >
                              {/* Cell index indicator */}
                              <span className="absolute top-1 left-1 text-[7px] sm:text-[8px] text-[var(--text-muted)] opacity-30 font-bold select-none leading-none pt-[1px] pl-[1px]">{index}</span>
                              
                              <span className="relative z-10">{data[index]}</span>
                            </motion.button>
                          );
                        })
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Views Switcher */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-[var(--border-color)] inline-flex gap-1 shadow-sm">
            {[
              { id: 'expression', label: 'Expression', icon: List },
              { id: 'truthTable', label: 'Truth Table', icon: TableIcon },
              { id: 'circuit', label: 'Circuit', icon: Cpu }
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  activeView === view.id 
                    ? "bg-[var(--accent-olive)] text-white shadow-md scale-105" 
                    : "text-[var(--text-muted)] hover:bg-[var(--cell-active)]"
                )}
              >
                <view.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{view.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest opacity-60">
            <span className="animate-pulse">← Swipe Left or Right →</span>
          </div>
        </div>

        {/* Swipeable Result Area */}
        <div className="relative overflow-hidden min-h-[450px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                const threshold = 50;
                const views = ['expression', 'truthTable', 'circuit'];
                const currentIndex = views.indexOf(activeView);
                if (info.offset.x > threshold && currentIndex > 0) {
                  setActiveView(views[currentIndex - 1] as any);
                } else if (info.offset.x < -threshold && currentIndex < views.length - 1) {
                  setActiveView(views[currentIndex + 1] as any);
                }
              }}
              className="w-full touch-pan-y"
            >
              {activeView === 'expression' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div 
                    className={cn(
                      "bg-white border border-[var(--border-color)] p-3 sm:p-5 rounded-[20px] shadow-sm cursor-pointer transition-all min-h-[90px] m-0.5",
                      activeTab === 'sop' && "ring-2 ring-[var(--accent-olive)]"
                    )}
                    onClick={() => setActiveTab('sop')}
                  >
                    <span className="block text-[9px] sm:text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-2 sm:mb-2.5">Sum of Products (SOP)</span>
                    <div className="font-mono text-sm sm:text-lg text-[var(--accent-olive)] flex flex-wrap items-center gap-y-2">
                      <span className="mr-1 sm:mr-2 shrink-0">F = </span>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-y-2">
                        {sopExpression === "0" ? "0" : 
                         sopExpression === "1" ? "1" :
                         Array.from(new Set(sopGroups.map(g => g.expression))).sort().map((expr: string, i, arr) => {
                           const group = sopGroups.find(g => g.expression === expr);
                           return (
                             <React.Fragment key={expr}>
                              <span 
                                className="px-1 py-0.5 sm:px-1.5 sm:py-1.5 rounded-md flex items-center leading-none"
                                style={{ backgroundColor: group?.color }}
                              >
                                {renderTerm(expr)}
                              </span>
                              {i < arr.length - 1 && <span className="mx-0.5 sm:mx-1 text-xs sm:text-sm opacity-40">+</span>}
                             </React.Fragment>
                           );
                         })
                        }
                      </div>
                    </div>
                  </div>

                  <div 
                    className={cn(
                      "bg-white border border-[var(--border-color)] p-3 sm:p-5 rounded-[20px] shadow-sm cursor-pointer transition-all min-h-[90px] m-0.5",
                      activeTab === 'pos' && "ring-2 ring-[var(--accent-olive)]"
                    )}
                    onClick={() => setActiveTab('pos')}
                  >
                    <span className="block text-[9px] sm:text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-2 sm:mb-2.5">Product of Sums (POS)</span>
                    <div className="font-mono text-sm sm:text-lg text-[var(--accent-olive)] flex flex-wrap items-center gap-y-2">
                      <span className="mr-1 sm:mr-2 shrink-0">F = </span>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-y-2">
                        {posExpression === "0" ? "0" : 
                         posExpression === "1" ? "1" :
                         Array.from(new Set(posGroups.map(g => g.expression))).sort().map((expr: string, i, arr) => {
                           const group = posGroups.find(g => g.expression === expr);
                           return (
                             <React.Fragment key={expr}>
                              <span 
                                className="px-1 py-0.5 sm:px-1.5 sm:py-1.5 rounded-md flex items-center leading-none"
                                style={{ backgroundColor: group?.color }}
                              >
                                {renderTerm(expr)}
                              </span>
                              {i < arr.length - 1 && <span className="mx-0.5 sm:mx-1 text-xs sm:text-sm opacity-40">•</span>}
                             </React.Fragment>
                           );
                         })
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'truthTable' && (
                <TruthTable data={data} varCount={varCount} isSOP={activeTab === 'sop'} />
              )}

              {activeView === 'circuit' && (
                <CircuitDiagram groups={currentGroups} varCount={varCount} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
