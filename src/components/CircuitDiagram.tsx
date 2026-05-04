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

// ── 2. SVG 게이트 컴포넌트 (ANSI/IEEE 표준) ──────────────────────────────────
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

  // 좌표 계산용 상수
  const TRUNK_START_X = 40;
  const TRUNK_Y_GAP = 40;
  const getTrunkY = (varIndex: number) => 40 + varIndex * TRUNK_Y_GAP;
  const maxTrunkY = getTrunkY(varCount - 1);
  
  const TERM_START_Y = maxTrunkY + 80;
  const TERM_Y_GAP = 120;
  
  // 최대 게이트 깊이 계산 (SVG 너비 동적 조정용)
  const maxLits = Math.max(...validGroups.map(g => parseExpression(g.expression).length));
  const maxGates = Math.max(1, maxLits - 1);
  const GATE_X_START = 220;
  const GATE_X_STEP = 100;
  const MAX_X = GATE_X_START + (maxGates - 1) * GATE_X_STEP;
  
  const SVG_WIDTH = MAX_X + 250;
  const SVG_HEIGHT = TERM_START_Y + validGroups.length * TERM_Y_GAP + 40;

  // 최종 OR 게이트 좌표
  const OR_GATE_X = MAX_X + 80;
  const OR_GATE_Y = TERM_START_Y + ((validGroups.length - 1) * TERM_Y_GAP) / 2;

  return (
    <div className="w-full overflow-hidden rounded-[40px] border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-black uppercase tracking-wider">Dynamic Cascade Logic Circuit</h3>
      </div>

      <div className="relative w-full overflow-x-auto flex justify-center bg-white border border-gray-200 p-4 rounded-2xl">
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} width="100%" style={{ maxHeight: '700px' }} xmlns="http://www.w3.org/2000/svg">
          <g stroke="#000" strokeWidth="2" fill="none">
            
            {/* 1. 수평 입력선 (Trunk Lines) 생성 */}
            {variables.map((v, i) => {
              const y = getTrunkY(i);
              return (
                <g key={`trunk-${v}`}>
                  {/* 입력 라벨 및 메인 수평선 */}
                  <text x="15" y={y + 6} fill="#000" fontSize="16" fontWeight="bold" stroke="none">{v}</text>
                  <line x1={TRUNK_START_X} y1={y} x2={SVG_WIDTH - 150} y2={y} />
                </g>
              );
            })}

            {/* 2. 각 항(Term)별 게이트 및 배선 동적 생성 */}
            {validGroups.map((group, gIdx) => {
              const lits = parseExpression(group.expression);
              const laneY = TERM_START_Y + gIdx * TERM_Y_GAP;
              let termOutputX = 0;
              let termOutputY = laneY;

              if (lits.length === 1) {
                // 단일 리터럴 항 처리
                const lit = lits[0];
                const varIdx = variables.indexOf(lit.variable);
                const trunkY = getTrunkY(varIdx);
                const dropX = 120;
                
                termOutputX = GATE_X_START;
                
                return (
                  <g key={`term-${gIdx}`}>
                    <circle cx={dropX} cy={trunkY} r="4" fill="#000" stroke="none" />
                    <polyline points={`${dropX},${trunkY} ${dropX},${laneY} ${termOutputX},${laneY}`} />
                    {lit.inverted && <NotGate x={dropX + 20} y={laneY} />}
                    {/* 최종 OR 게이트로 연결 선 */}
                    {validGroups.length > 1 && (
                      <polyline points={`${termOutputX},${laneY} ${OR_GATE_X - 20},${laneY} ${OR_GATE_X - 20},${OR_GATE_Y} ${OR_GATE_X + 5},${OR_GATE_Y}`} />
                    )}
                  </g>
                );
              }

              return (
                <g key={`term-${gIdx}`}>
                  {lits.map((lit, lIdx) => {
                    const varIdx = variables.indexOf(lit.variable);
                    const trunkY = getTrunkY(varIdx);
                    
                    if (lIdx === 0 || lIdx === 1) {
                      // 첫 번째 2-입력 AND 게이트의 배선 (Level 1)
                      const dropX = 100 + lIdx * 30;
                      const targetY = laneY + (lIdx === 0 ? -10 : 10);
                      const notOffsetX = 160;

                      return (
                        <g key={`wire-${gIdx}-${lIdx}`}>
                          <circle cx={dropX} cy={trunkY} r="4" fill="#000" stroke="none" />
                          <polyline points={`${dropX},${trunkY} ${dropX},${targetY} ${GATE_X_START},${targetY}`} />
                          {lit.inverted && <NotGate x={notOffsetX} y={targetY} />}
                        </g>
                      );
                    } else {
                      // 세 번째 입력부터 순차적(Cascade) AND 게이트 추가 (Level 2~N)
                      const gateX = GATE_X_START + (lIdx - 1) * GATE_X_STEP;
                      const prevGateX = gateX - GATE_X_STEP;
                      const dropX = gateX - 40;
                      const targetY = laneY + 10;
                      const notOffsetX = gateX - 35;

                      return (
                        <g key={`wire-${gIdx}-${lIdx}`}>
                          {/* 이전 게이트의 출력을 현재 게이트의 위쪽 입력으로 연결 */}
                          <polyline points={`${prevGateX + 44},${laneY} ${prevGateX + 60},${laneY} ${prevGateX + 60},${laneY - 10} ${gateX},${laneY - 10}`} />
                          
                          {/* 현재 변수의 하강 분기선을 현재 게이트의 아래쪽 입력으로 연결 */}
                          <circle cx={dropX} cy={trunkY} r="4" fill="#000" stroke="none" />
                          <polyline points={`${dropX},${trunkY} ${dropX},${targetY} ${gateX},${targetY}`} />
                          {lit.inverted && <NotGate x={notOffsetX} y={targetY} />}
                        </g>
                      );
                    }
                  })}

                  {/* 항(Term) 내의 AND 게이트 렌더링 */}
                  {Array.from({ length: lits.length - 1 }).map((_, i) => (
                    <AndGate key={`and-${gIdx}-${i}`} x={GATE_X_START + i * GATE_X_STEP} y={laneY} />
                  ))}

                  {/* 최종 OR 게이트로 연결되는 항의 최종 출력선 */}
                  {validGroups.length > 1 && (() => {
                    const finalAndX = GATE_X_START + (lits.length - 2) * GATE_X_STEP + 44;
                    // 항의 Y축 위치에 따라 OR 게이트 입력 단자 분산
                    const orInputOffset = validGroups.length === 2 ? (gIdx === 0 ? -10 : 10) : 
                                         (gIdx - (validGroups.length - 1) / 2) * 10;
                    const targetOrY = OR_GATE_Y + orInputOffset;
                    
                    return (
                      <polyline points={`${finalAndX},${laneY} ${OR_GATE_X - 20},${laneY} ${OR_GATE_X - 20},${targetOrY} ${OR_GATE_X + 5},${targetOrY}`} />
                    );
                  })()}
                </g>
              );
            })}

            {/* 3. 최종 출력 병합 (OR 게이트 및 최종 라벨) */}
            {validGroups.length > 1 ? (
              <g>
                <OrGate x={OR_GATE_X} y={OR_GATE_Y} />
                <line x1={OR_GATE_X + 44} y1={OR_GATE_Y} x2={OR_GATE_X + 80} y2={OR_GATE_Y} />
                <text x={OR_GATE_X + 90} y={OR_GATE_Y + 6} fill="#000" fontSize="18" fontWeight="bold" stroke="none">X</text>
              </g>
            ) : validGroups.length === 1 ? (
              // 그룹이 1개뿐이라 OR 게이트가 필요 없는 경우
              <g>
                <line 
                  x1={GATE_X_START + (parseExpression(validGroups[0].expression).length - 2) * GATE_X_STEP + 44} 
                  y1={TERM_START_Y} 
                  x2={MAX_X + 80} 
                  y2={TERM_START_Y} 
                />
                <text x={MAX_X + 90} y={TERM_START_Y + 6} fill="#000" fontSize="18" fontWeight="bold" stroke="none">X</text>
              </g>
            ) : null}
          </g>
        </svg>
      </div>
    </div>
  );
};
