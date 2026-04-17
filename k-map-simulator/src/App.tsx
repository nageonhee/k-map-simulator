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
  const [varCount, setVarCount] = useState<2 | 3 | 4>(4);
  const [data, setData] = useState<CellValue[]>(new Array(16).fill(0));
  const [activeTab, setActiveTab] = useState<'sop' | 'pos'>('sop');
  const [activeView, setActiveView] = useState<'expression' | 'truthTable' | 'circuit'>('expression');
  const [interactionMode, setInteractionMode] = useState<'toggle' | 'dontcare'>('toggle');

  const handleCellClick = (index: number) => {
    const newData = [...data];
    if (interactionMode === 'toggle') {
      newData[index] = newData[index] === 0 ? 1 : 0;
    } else {
      newData[index] = newData[index] === 'X' ? 0 : 'X';
    }
    setData(newData);
  };

  const handleVarCountChange = (count: number) => {
    const c = count as 2 | 3 | 4;
    setVarCount(c);
    setData(new Array(Math.pow(2, c)).fill(0));
  };

  const sopGroups = useMemo(() => findPrimeImplicants(data.slice(0, Math.pow(2, varCount)), varCount, 1), [data, varCount]);
  const posGroups = useMemo(() => findPrimeImplicants(data.slice(0, Math.pow(2, varCount)), varCount, 0), [data, varCount]);

  const sopExpression = useMemo(() => simplifyExpression(sopGroups, true), [sopGroups]);
  const posExpression = useMemo(() => simplifyExpression(posGroups, false), [posGroups]);

  const currentGroups = activeTab === 'sop' ? sopGroups : posGroups;

  // Grid configuration
  const rowBits = varCount === 4 ? 2 : 1;
  const colBits = varCount >= 3 ? 2 : 1;
  const rowGray = getGrayCode(rowBits);
  const colGray = getGrayCode(colBits);

  const getIndex = (r: number, c: number) => {
    if (varCount === 4) return (rowGray[r] << 2) | colGray[c];
    if (varCount === 3) return (rowGray[r] << 2) | colGray[c];
    return (rowGray[r] << 1) | colGray[c];
  };

  const getCellColors = (index: number) => {
    return currentGroups
      .filter(g => g.cells.includes(index))
      .map(g => g.color);
  };

  // Helper to get (r, c) from index
  const getCoords = (index: number) => {
    for (let r = 0; r < rowGray.length; r++) {
      for (let c = 0; c < colGray.length; c++) {
        if (getIndex(r, c) === index) return { r, c };
      }
    }
    return { r: 0, c: 0 };
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

  const renderLoops = () => {
    const cellSize = 80; // 5rem = 80px
    return (
      <svg className="absolute inset-0 pointer-events-none z-20 overflow-visible" width={colGray.length * cellSize} height={rowGray.length * cellSize}>
        {currentGroups.map((group, gIdx) => {
          const coords: any[] = group.cells.map(idx => getCoords(idx));
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
      <aside className="w-full lg:w-[280px] bg-[var(--sidebar-bg)] border-b lg:border-b-0 lg:border-r border-[var(--border-color)] p-6 lg:p-10 flex flex-col gap-6 lg:gap-8 shrink-0">
        <div>
          <h1 className="font-serif italic text-2xl text-[var(--accent-olive)] mb-2">K-Map Simulator</h1>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Boolean logic minimization tool with real-time grouping visualization.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase font-semibold tracking-widest text-[var(--text-muted)]">Number of Variables</span>
          <div className="flex gap-2">
            {[2, 3, 4].map((n) => (
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

        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase font-semibold tracking-widest text-[var(--text-muted)]">Interaction Mode</span>
          <div className="text-sm space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="mode"
                checked={interactionMode === 'toggle'} 
                onChange={() => setInteractionMode('toggle')}
                className="accent-[var(--accent-olive)]" 
              />
              <span>Toggle 0/1</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="mode"
                checked={interactionMode === 'dontcare'} 
                onChange={() => setInteractionMode('dontcare')}
                className="accent-[var(--accent-olive)]" 
              />
              <span>Don't Care (X)</span>
            </label>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-[var(--border-color)] space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">Active Groups</span>
            <span className="font-semibold">{currentGroups.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">Literals ({activeTab.toUpperCase()})</span>
            <span className="font-semibold">
              {activeTab === 'sop' ? sopExpression.replace(/[^A-D']/g, '').length : posExpression.replace(/[^A-D']/g, '').length}
            </span>
          </div>
          <button 
            onClick={() => setData(new Array(Math.pow(2, varCount)).fill(0))}
            className="w-full py-3 mt-4 bg-white border border-[var(--accent-olive)] rounded-lg text-[var(--accent-olive)] font-semibold hover:bg-[var(--accent-olive)] hover:text-white transition-all duration-200"
          >
            Reset Map
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-10 flex flex-col gap-8 lg:gap-10 overflow-x-hidden">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative p-4 sm:p-10 scale-[0.65] min-[400px]:scale-[0.85] sm:scale-100 origin-top sm:origin-center">
            {/* Variable Labels - Positioned in the top-left corner of the table */}
            <div className="absolute top-0 left-0 w-12 h-12 flex items-center justify-center">
              <div className="relative font-bold text-xs sm:text-sm text-[var(--accent-olive)] flex flex-col items-center leading-none">
                <span className="self-end mr-1">{varCount === 2 ? "B" : varCount === 3 ? "BC" : "CD"}</span>
                <div className="w-10 h-[1.5px] bg-[var(--accent-olive)] opacity-30 rotate-[45deg] my-0.5"></div>
                <span className="self-start ml-1">{varCount === 2 ? "A" : varCount === 3 ? "A" : "AB"}</span>
              </div>
            </div>

            {/* Column Labels */}
            <div className="flex ml-12 mb-2 w-full justify-around text-xs sm:text-sm text-[var(--text-muted)] font-medium">
              {colGray.map(g => (
                <span key={g} className="w-20 text-center">
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
                {renderLoops()}
                {rowGray.map((_, r) => (
                  colGray.map((_, c) => {
                    const index = getIndex(r, c);
                    const colors = getCellColors(index);
                    const isOne = data[index] === 1;
                    const isX = data[index] === 'X';
                    return (
                      <motion.button
                        key={`${r}-${c}`}
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
                        <span className="relative z-10">{data[index]}</span>
                      </motion.button>
                    );
                  })
                ))}
              </div>
            </div>
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
                      "bg-white border border-[var(--border-color)] p-4 sm:p-6 rounded-[24px] shadow-sm cursor-pointer transition-all min-h-[100px]",
                      activeTab === 'sop' && "ring-2 ring-[var(--accent-olive)]"
                    )}
                    onClick={() => setActiveTab('sop')}
                  >
                    <span className="block text-[9px] sm:text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-2 sm:mb-3">Sum of Products (SOP)</span>
                    <div className="font-mono text-sm sm:text-xl text-[var(--accent-olive)] flex flex-wrap items-center gap-y-2">
                      <span className="mr-1 sm:mr-2 shrink-0">F = </span>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-y-3">
                        {sopExpression === "0" ? "0" : 
                         sopExpression === "1" ? "1" :
                         Array.from(new Set(sopGroups.map(g => g.expression))).map((expr: string, i, arr) => {
                           const group = sopGroups.find(g => g.expression === expr);
                           return (
                             <React.Fragment key={expr}>
                              <span 
                                className="px-1.5 py-1 sm:px-2 sm:py-2.5 rounded-lg flex items-center leading-none"
                                style={{ backgroundColor: group?.color }}
                              >
                                {renderTerm(expr)}
                              </span>
                              {i < arr.length - 1 && <span className="mx-0.5 sm:mx-1.5 text-xs sm:text-sm opacity-40">+</span>}
                             </React.Fragment>
                           );
                         })
                        }
                      </div>
                    </div>
                  </div>

                  <div 
                    className={cn(
                      "bg-white border border-[var(--border-color)] p-4 sm:p-6 rounded-[24px] shadow-sm cursor-pointer transition-all min-h-[100px]",
                      activeTab === 'pos' && "ring-2 ring-[var(--accent-olive)]"
                    )}
                    onClick={() => setActiveTab('pos')}
                  >
                    <span className="block text-[9px] sm:text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-2 sm:mb-3">Product of Sums (POS)</span>
                    <div className="font-mono text-sm sm:text-xl text-[var(--accent-olive)] flex flex-wrap items-center gap-y-2">
                      <span className="mr-1 sm:mr-2 shrink-0">F = </span>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-y-3">
                        {posExpression === "0" ? "0" : 
                         posExpression === "1" ? "1" :
                         Array.from(new Set(posGroups.map(g => g.expression))).map((expr: string, i, arr) => {
                           const group = posGroups.find(g => g.expression === expr);
                           return (
                             <React.Fragment key={expr}>
                              <span 
                                className="px-1.5 py-1 sm:px-2 sm:py-2.5 rounded-lg flex items-center leading-none"
                                style={{ backgroundColor: group?.color }}
                              >
                                {renderTerm(expr)}
                              </span>
                              {i < arr.length - 1 && <span className="mx-0.5 text-xs sm:text-sm opacity-40">•</span>}
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
