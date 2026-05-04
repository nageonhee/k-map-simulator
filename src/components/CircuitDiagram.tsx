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

// ── 2. SVG 게이트 컴포넌트 (ANSI/IEEE 표준 및 동적 크기 조정) ─────────────────
function AndGate({ x, y, inputs }: { x: number; y: number; inputs: number }) {
  // 입력 개수에 비례하여 게이트의 높이를 동적으로 확장
  const h = Math.max(40, inputs * 15);
  const r = h / 2;
  const w = 20;
  return (
    <path
      d={`M ${x},${y - r} L ${x + w},${y - r} A ${r} ${r} 0 0 1 ${x + w},${y + r} L ${x},${y + r} Z`}
      fill="#fff" stroke="#000" strokeWidth="2"
    />
  );
}

function OrGate({ x, y, inputs }: { x: number; y: number; inputs: number }) {
  // 입력 개수에 비례하여 게이트의 높이를 동적으로 확장
  const h = Math.max(40, inputs * 15);
  const r = h / 2;
  const w = 20;
  return (
    <path
      d={`M ${x},${y - r} Q ${x + 10},${y} ${x},${y + r} Q ${x + w + 10},${y + r} ${x + w + r},${y} Q ${x + w + 10},${y - r} ${x},${y - r} Z`}
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

  // ── 좌표 및 레이아웃 상수 계산 ──
  const TRUNK_START_X = 40;
  const TRUNK_Y_GAP = 40;
  const getTrunkY = (i: number) => 40 + i * TRUNK_Y_GAP;
  
  const DROP_X_START = 80;
  const DROP_X_GAP = 25;
  const AND_X = DROP_X_START + varCount * DROP_X_GAP + 60;
  
  // 각 항(Term)별 게이트 높이 및 Y좌표 계산
  let currentY = getTrunkY(varCount - 1) + 60;
  const termLayouts = validGroups.map((group) => {
    const lits = parseExpression(group.expression);
    const inputs = lits.length;
    const h = Math.max(40, inputs * 15);
    const laneY = currentY + h / 2;
    currentY += h + 40; // 다음 항을 위한 간격 추가
    return { group, lits, inputs, h, laneY };
  });

  const OR_X = AND_X + Math.max(...termLayouts.map(t => t.inputs > 1 ? t.h / 2 + 20 : 0)) + 80;
  const orInputs = validGroups.length;
  const orH = Math.max(40, orInputs * 15);
  const OR_Y = termLayouts.length > 0 ? (termLayouts[0].laneY + termLayouts[termLayouts.length - 1].laneY) / 2 : 0;

  const SVG_WIDTH = OR_X + 150;
  const SVG_HEIGHT = currentY + 40;

  return (
    <div className="w-full overflow-hidden rounded-[40px] border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-black uppercase tracking-wider">Dynamic Multi-Input Logic Circuit</h3>
      </div>

      <div className="relative w-full overflow-x-auto flex justify-center bg-white border border-gray-200 p-4 rounded-2xl">
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} width="100%" style={{ maxHeight: '700px' }} xmlns="http://www.w3.org/2000/svg">
          <g stroke="#000" strokeWidth="2" fill="none">
            
            {/* 1. 수평 입력선 (Trunk Lines) 생성 */}
            {variables.map((v, i) => {
              const y = getTrunkY(i);
              return (
                <g key={`trunk-${v}`}>
                  <text x="15" y={y + 6} fill="#000" fontSize="16" fontWeight="bold" stroke="none">{v}</text>
                  <line x1={TRUNK_START_X} y1={y} x2={SVG_WIDTH - 100} y2={y} stroke="#ccc" />
                </g>
              );
            })}

            {/* 2. 각 항(Term)별 게이트 및 배선 동적 생성 */}
            {termLayouts.map((term, gIdx) => {
              const { lits, inputs, h, laneY } = term;
              let termOutputX = AND_X;

              // 단일 리터럴 항 처리 (AND 게이트 생략)
              if (inputs === 1) {
                const lit = lits[0];
                const varIdx = variables.indexOf(lit.variable);
                const trunkY = getTrunkY(varIdx);
                const dropX = DROP_X_START + varIdx * DROP_X_GAP;
                termOutputX = AND_X + 24;

                return (
                  <g key={`term-${gIdx}`}>
                    <circle cx={dropX} cy={trunkY} r="4" fill="#000" stroke="none" />
                    <polyline points={`${dropX},${trunkY} ${dropX},${laneY} ${AND_X - 24},${laneY}`} />
                    {lit.inverted && <NotGate x={AND_X - 24} y={laneY} />}
                    <line x1={AND_X} y1={laneY} x2={termOutputX} y2={laneY} />
                    
                    {validGroups.length > 1 && (() => {
                      const targetOrY = OR_Y - orH / 2 + (gIdx + 0.5) * (orH / orInputs);
                      return <polyline points={`${termOutputX},${laneY} ${OR_X - 30},${laneY} ${OR_X - 30},${targetOrY} ${OR_X},${targetOrY}`} />;
                    })()}
                  </g>
                );
              }

              // 다입력 AND 게이트 및 배선 처리
              termOutputX = AND_X + 20 + h / 2;
              return (
                <g key={`term-${gIdx}`}>
                  <AndGate x={AND_X} y={laneY} inputs={inputs} />
                  
                  {lits.map((lit, lIdx) => {
                    const varIdx = variables.indexOf(lit.variable);
                    const trunkY = getTrunkY(varIdx);
                    const dropX = DROP_X_START + varIdx * DROP_X_GAP;
                    // 다입력 게이트의 입력 포트 위치 등분 계산
                    const targetY = laneY - h / 2 + (lIdx + 0.5) * (h / inputs);

                    return (
                      <g key={`wire-${gIdx}-${lIdx}`}>
                        <circle cx={dropX} cy={trunkY} r="4" fill="#000" stroke="none" />
                        <polyline points={`${dropX},${trunkY} ${dropX},${targetY} ${AND_X - 24},${targetY}`} />
                        {lit.inverted ? (
                          <>
                            <NotGate x={AND_X - 24} y={targetY} />
                          </>
                        ) : (
                          <line x1={AND_X - 24} y1={targetY} x2={AND_X} y2={targetY} />
                        )}
                      </g>
                    );
                  })}

                  {/* AND 게이트 출력을 최종 OR 게이트로 연결 */}
                  {validGroups.length > 1 && (() => {
                    const targetOrY = OR_Y - orH / 2 + (gIdx + 0.5) * (orH / orInputs);
                    return <polyline points={`${termOutputX},${laneY} ${OR_X - 30},${laneY} ${OR_X - 30},${targetOrY} ${OR_X},${targetOrY}`} />;
                  })()}
                </g>
              );
            })}

            {/* 3. 최종 출력 병합 (OR 게이트 및 X 라벨) */}
            {validGroups.length > 1 ? (
              <g>
                <OrGate x={OR_X} y={OR_Y} inputs={orInputs} />
                <line x1={OR_X + 20 + orH / 2} y1={OR_Y} x2={OR_X + 20 + orH / 2 + 30} y2={OR_Y} />
                <text x={OR_X + 20 + orH / 2 + 40} y={OR_Y + 6} fill="#000" fontSize="18" fontWeight="bold" stroke="none">X</text>
              </g>
            ) : validGroups.length === 1 ? (
              <g>
                <line x1={AND_X + 20 + termLayouts[0].h / 2} y1={termLayouts[0].laneY} x2={OR_X + 50} y2={termLayouts[0].laneY} />
                <text x={OR_X + 60} y={termLayouts[0].laneY + 6} fill="#000" fontSize="18" fontWeight="bold" stroke="none">X</text>
              </g>
            ) : null}
            
          </g>
        </svg>
      </div>
    </div>
  );
};
