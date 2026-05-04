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

// ── 2. SVG 게이트 컴포넌트 ─────────────────────────────────────────────────────
function AndGate({ x, y }: { x: number; y: number }) {
  const r = 20;
  return (
    <path
      d={`M ${x},${y - r} L ${x + 24},${y - r} A ${r} ${r} 0 0 1 ${x + 24},${y + r} L ${x},${y + r} Z`}
      fill="#fff" stroke="#000" strokeWidth="2"
    />
  );
}

function OrGate({ x, y }: { x: number; y: number }) {
  const r = 20;
  return (
    <path
      d={`M ${x},${y - r} Q ${x + 10},${y} ${x},${y + r} Q ${x + 34},${y + r} ${x + 44},${y} Q ${x + 34},${y - r} ${x},${y - r} Z`}
      fill="#fff" stroke="#000" strokeWidth="2"
    />
  );
}

function NotGate({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <polygon points={`${x},${y - 8} ${x + 16},${y} ${x},${y + 8}`} fill="#fff" stroke="#000" strokeWidth="2" />
      <circle cx={x + 20} cy={y} r="4" fill="#fff" stroke="#000" strokeWidth="2" />
    </g>
  );
}

// ── 3. 동적 회로도 생성 메인 컴포넌트 ───────────────────────────────────────────
export const CircuitDiagram: React.FC<CircuitDiagramProps> = ({ groups, varCount }) => {
  const validGroups = groups.filter(g => g.expression && !['0', '1'].includes(g.expression.trim()));
  const variables = ['A', 'B', 'C', 'D', 'E'].slice(0, varCount);

  if (validGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-gray-400 italic gap-2 bg-white rounded-[40px] border border-gray-200">
        <p className="font-medium">No logic gates to display</p>
      </div>
    );
  }

  // 레이아웃 상수 계산
  const BUS_START_X = 40;
  const BUS_GAP = 30;
  const AND_START_X = BUS_START_X + (varCount * BUS_GAP) + 80;
  const GATE_Y_GAP = 80;
  
  const SVG_HEIGHT = validGroups.length * GATE_Y_GAP + 100;
  const SVG_WIDTH = AND_START_X + 250;

  const OR_GATE_X = AND_START_X + 100;
  const OR_GATE_Y = (validGroups.length * GATE_Y_GAP) / 2 + 40;

  return (
    <div className="w-full overflow-hidden rounded-[40px] border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-black uppercase tracking-wider">Dynamic Logic Circuit</h3>
      </div>

      <div className="relative w-full overflow-x-auto flex justify-center bg-white border border-gray-200 p-4 rounded-2xl">
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} width="100%" style={{ maxHeight: '600px' }} xmlns="http://www.w3.org/2000/svg">
          <g stroke="#000" strokeWidth="2" fill="none">
            
            {/* 세로축 변수 버스(Bus) 라인 생성 */}
            {variables.map((v, i) => {
              const vx = BUS_START_X + i * BUS_GAP;
              return (
                <g key={`bus-${v}`}>
                  <line x1={vx} y1="30" x2={vx} y2={SVG_HEIGHT - 20} stroke="#ccc" />
                  <text x={vx - 5} y="20" fill="#000" fontSize="14" fontWeight="bold" stroke="none">{v}</text>
                </g>
              );
            })}

            {/* AND 게이트 및 입력 연결선 생성 */}
            {validGroups.map((group, gIdx) => {
              const lits = parseExpression(group.expression);
              const AND_Y = 60 + gIdx * GATE_Y_GAP;

              return (
                <g key={`and-group-${gIdx}`}>
                  {/* AND 게이트 본체 */}
                  <AndGate x={AND_START_X} y={AND_Y} />

                  {/* 변수 버스에서 AND 게이트로 연결되는 가로선 */}
                  {lits.map((lit, lIdx) => {
                    const varIndex = variables.indexOf(lit.variable);
                    if (varIndex === -1) return null;
                    
                    const startX = BUS_START_X + varIndex * BUS_GAP;
                    // AND 게이트의 입력 포트 위치 분산 계산
                    const inputOffsetY = AND_Y - 10 + (20 / (lits.length === 1 ? 1 : lits.length - 1)) * lIdx;

                    return (
                      <g key={`wire-${gIdx}-${lIdx}`}>
                        {/* 분기점 점(Dot) 표시 */}
                        <circle cx={startX} cy={inputOffsetY} r="3" fill="#000" stroke="none" />
                        
                        {lit.inverted ? (
                          <>
                            <line x1={startX} y1={inputOffsetY} x2={AND_START_X - 40} y2={inputOffsetY} />
                            <NotGate x={AND_START_X - 40} y={inputOffsetY} />
                            <line x1={AND_START_X - 16} y1={inputOffsetY} x2={AND_START_X} y2={inputOffsetY} />
                          </>
                        ) : (
                          <line x1={startX} y1={inputOffsetY} x2={AND_START_X} y2={inputOffsetY} />
                        )}
                      </g>
                    );
                  })}

                  {/* AND 게이트 출력에서 최종 OR 게이트로 연결 */}
                  {validGroups.length > 1 && (
                    <polyline points={`${AND_START_X + 44},${AND_Y} ${AND_START_X + 70},${AND_Y} ${AND_START_X + 70},${OR_GATE_Y} ${OR_GATE_X},${OR_GATE_Y}`} />
                  )}
                </g>
              );
            })}

            {/* 단일 항이 아닐 경우 최종 OR 게이트 생성 */}
            {validGroups.length > 1 ? (
              <g>
                <OrGate x={OR_GATE_X} y={OR_GATE_Y} />
                <line x1={OR_GATE_X + 44} y1={OR_GATE_Y} x2={OR_GATE_X + 70} y2={OR_GATE_Y} />
                <text x={OR_GATE_X + 80} y={OR_GATE_Y + 5} fill="#000" fontSize="18" fontWeight="bold" stroke="none">X</text>
              </g>
            ) : (
              /* 단일 항(AND 게이트 1개)일 경우 바로 X 출력 */
              <g>
                <line x1={AND_START_X + 44} y1="60" x2={AND_START_X + 70} y2="60" />
                <text x={AND_START_X + 80} y="65" fill="#000" fontSize="18" fontWeight="bold" stroke="none">X</text>
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};
