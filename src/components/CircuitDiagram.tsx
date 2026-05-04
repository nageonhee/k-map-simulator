import React from 'react';
import { KMapGroup } from '../lib/KMapLogic';

interface CircuitDiagramProps {
  groups: KMapGroup[];
  varCount: number;
}

// ── 1. 논리식 파싱 함수 ────────────────────────────────────────────────────────
function parseExpression(expr: string) {
  const matches = expr.match(/([A-E])'?/g) || [];
  return matches.map(m => ({
    variable: m[0],
    inverted: m.endsWith("'")
  }));
}

// ── 2. SVG 게이트 컴포넌트 (ANSI/IEEE 표준, 직각 마감) ──────────────────────────
function AndGate({ x, y, inputs }: { x: number; y: number; inputs: number }) {
  const h = Math.max(40, inputs * 16);
  const r = h / 2;
  const w = 24;
  return (
    <path
      d={`M ${x},${y - r} L ${x + w},${y - r} A ${r} ${r} 0 0 1 ${x + w},${y + r} L ${x},${y + r} Z`}
      fill="#fff" stroke="#000" strokeWidth="2.5" strokeLinejoin="miter"
    />
  );
}

function OrGate({ x, y, inputs }: { x: number; y: number; inputs: number }) {
  const h = Math.max(40, inputs * 18);
  const r = h / 2;
  const w = 24;
  return (
    <path
      d={`M ${x},${y - r} Q ${x + 15},${y} ${x},${y + r} Q ${x + w + 15},${y + r} ${x + w + r + 10},${y} Q ${x + w + 15},${y - r} ${x},${y - r} Z`}
      fill="#fff" stroke="#000" strokeWidth="2.5" strokeLinejoin="miter"
    />
  );
}

function NotGate({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#000" strokeWidth="2.5" fill="#fff">
      <polygon points={`${x},${y - 8} ${x + 16},${y} ${x},${y + 8}`} strokeLinejoin="miter" />
      <circle cx={x + 20} cy={y} r="4" />
    </g>
  );
}

// ── 3. 동적 회로도 생성 메인 컴포넌트 ───────────────────────────────────────────
export const CircuitDiagram: React.FC<CircuitDiagramProps> = ({ groups, varCount }) => {
  let validGroups = groups.filter(g => g.expression && !['0', '1'].includes(g.expression.trim()));
  let activeVarCount = varCount;
  let isExample = false;

  // 입력된 논리식이 없을 경우, 설명 예시(AB + A'C)를 기본으로 렌더링합니다.
  if (validGroups.length === 0) {
    validGroups = [
      { id: 'ex1', expression: "AB", color: '', cells: [] },
      { id: 'ex2', expression: "A'C", color: '', cells: [] }
    ];
    activeVarCount = 3;
    isExample = true;
  }

  const variables = ['A', 'B', 'C', 'D', 'E'].slice(0, activeVarCount);

  // ── 좌표 및 직각 레이아웃 설정 ──
  const VAR_START_X = 20;
  const VAR_Y_GAP = 35;
  const DROP_START_X = 70;
  const DROP_X_GAP = 30;

  const getVarY = (i: number) => 30 + i * VAR_Y_GAP;
  const getDropX = (i: number) => DROP_START_X + i * DROP_X_GAP;

  const AND_X = getDropX(activeVarCount - 1) + 80;

  // 불필요한 연장선을 방지하기 위한 최대 Y 좌표 추적 배열
  const maxDropY = Array(activeVarCount).fill(0);
  for (let i = 0; i < activeVarCount; i++) maxDropY[i] = getVarY(i);

  let currentY = getVarY(activeVarCount - 1) + 50;
  const termLayouts = validGroups.map((group) => {
    const lits = parseExpression(group.expression);
    const inputs = lits.length;
    const h = Math.max(40, inputs * 16);
    const laneY = currentY + h / 2;

    const inputCoords = lits.map((lit, lIdx) => {
      const varIdx = variables.indexOf(lit.variable);
      const inputY = laneY - h / 2 + (lIdx + 0.5) * (h / inputs);
      
      if (varIdx !== -1 && inputY > maxDropY[varIdx]) {
        maxDropY[varIdx] = inputY;
      }
      return { ...lit, varIdx, inputY };
    });

    currentY += h + 30;
    return { group, lits, inputs, h, laneY, inputCoords };
  });

  const maxAndWidth = Math.max(...termLayouts.map(t => t.inputs > 1 ? 24 + t.h / 2 : 0));
  const OR_X = AND_X + maxAndWidth + 70;
  const orInputs = validGroups.length;
  const orH = Math.max(40, orInputs * 18);
  const OR_Y = termLayouts.length > 0 ? (termLayouts[0].laneY + termLayouts[termLayouts.length - 1].laneY) / 2 : 0;

  const SVG_WIDTH = OR_X + 120;
  const SVG_HEIGHT = currentY + 20;

  return (
    <div className="w-full overflow-hidden rounded-[40px] border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-black uppercase tracking-wider">
          {isExample ? "Logic Circuit Diagram (Example: AB + A'C)" : "Logic Circuit Diagram"}
        </h3>
      </div>

      <div className="relative w-full overflow-x-auto flex justify-center bg-white border border-gray-200 p-8 rounded-2xl">
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} width="100%" style={{ maxHeight: '700px' }} xmlns="http://www.w3.org/2000/svg">
          <g stroke="#000" strokeWidth="2.5" fill="none" strokeLinejoin="miter">
            
            {/* 1. 변수 입력 및 수직 분기 라인 (직각 꺾임) */}
            {variables.map((v, i) => {
              const varY = getVarY(i);
              const dropX = getDropX(i);
              return (
                <g key={`trunk-${v}`}>
                  <text x={VAR_START_X} y={varY + 6} fill="#000" fontSize="18" fontWeight="900" stroke="none" fontFamily="sans-serif">{v}</text>
                  <line x1={VAR_START_X + 25} y1={varY} x2={dropX} y2={varY} />
                  <circle cx={dropX} cy={varY} r="4.5" fill="#000" stroke="none" />
                  <line x1={dropX} y1={varY} x2={dropX} y2={maxDropY[i]} />
                </g>
              );
            })}

            {/* 2. 논리항 게이트 및 수평 배선 */}
            {termLayouts.map((term, gIdx) => {
              const { inputs, h, laneY, inputCoords } = term;
              let termOutputX = AND_X;

              if (inputs === 1) {
                const inp = inputCoords[0];
                if (inp.varIdx === -1) return null;
                const dropX = getDropX(inp.varIdx);
                termOutputX = AND_X + 24;

                return (
                  <g key={`term-${gIdx}`}>
                    <circle cx={dropX} cy={inp.inputY} r="3.5" fill="#000" stroke="none" />
                    <line x1={dropX} y1={inp.inputY} x2={AND_X - 25} y2={inp.inputY} />
                    {inp.inverted && <NotGate x={AND_X - 25} y={inp.inputY} />}
                    <line x1={AND_X} y1={inp.inputY} x2={termOutputX} y2={inp.inputY} />
                    
                    {validGroups.length > 1 && (() => {
                      const targetOrY = OR_Y - orH / 2 + (gIdx + 0.5) * (orH / orInputs);
                      return <polyline points={`${termOutputX},${laneY} ${OR_X - 25},${laneY} ${OR_X - 25},${targetOrY} ${OR_X},${targetOrY}`} />;
                    })()}
                  </g>
                );
              }

              termOutputX = AND_X + 24 + h / 2;
              return (
                <g key={`term-${gIdx}`}>
                  <AndGate x={AND_X} y={laneY} inputs={inputs} />
                  
                  {inputCoords.map((inp, lIdx) => {
                    if (inp.varIdx === -1) return null;
                    const dropX = getDropX(inp.varIdx);

                    return (
                      <g key={`wire-${gIdx}-${lIdx}`}>
                        <circle cx={dropX} cy={inp.inputY} r="3.5" fill="#000" stroke="none" />
                        <line x1={dropX} y1={inp.inputY} x2={AND_X - 25} y2={inp.inputY} />
                        {inp.inverted ? (
                          <NotGate x={AND_X - 25} y={inp.inputY} />
                        ) : (
                          <line x1={AND_X - 25} y1={inp.inputY} x2={AND_X} y2={inp.inputY} />
                        )}
                      </g>
                    );
                  })}

                  {validGroups.length > 1 && (() => {
                    const targetOrY = OR_Y - orH / 2 + (gIdx + 0.5) * (orH / orInputs);
                    return <polyline points={`${termOutputX},${laneY} ${OR_X - 25},${laneY} ${OR_X - 25},${targetOrY} ${OR_X},${targetOrY}`} />;
                  })()}
                </g>
              );
            })}

            {/* 3. 최종 OR 게이트 병합 */}
            {validGroups.length > 1 ? (
              <g>
                <OrGate x={OR_X} y={OR_Y} inputs={orInputs} />
                <line x1={OR_X + 24 + orH / 2 + 10} y1={OR_Y} x2={OR_X + 24 + orH / 2 + 40} y2={OR_Y} />
                <text x={OR_X + 24 + orH / 2 + 50} y={OR_Y + 6} fill="#000" fontSize="20" fontWeight="900" stroke="none" fontFamily="sans-serif">X</text>
              </g>
            ) : validGroups.length === 1 ? (
              <g>
                <line x1={AND_X + 24 + termLayouts[0].h / 2} y1={termLayouts[0].laneY} x2={OR_X + 30} y2={termLayouts[0].laneY} />
                <text x={OR_X + 40} y={termLayouts[0].laneY + 6} fill="#000" fontSize="20" fontWeight="900" stroke="none" fontFamily="sans-serif">X</text>
              </g>
            ) : null}
            
          </g>
        </svg>
      </div>
    </div>
  );
};
