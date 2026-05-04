import React from 'react';

// ── Gate Components ─────────────────────────────────────────────────────────────

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
      <polygon points={`${x},${y - 10} ${x + 20},${y} ${x},${y + 10}`} fill="#fff" stroke="#000" strokeWidth="2" />
      <circle cx={x + 24} cy={y} r="4" fill="#fff" stroke="#000" strokeWidth="2" />
    </g>
  );
}

export const CircuitDiagram: React.FC<any> = () => {
  return (
    <div className="w-full overflow-hidden rounded-[40px] border border-gray-200 bg-white p-4 sm:p-8 shadow-sm">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-black uppercase tracking-wider">
            Logic Circuit Diagram
          </h3>
          <p className="text-[10px] text-gray-500 font-medium">
            Custom Static Rendering
          </p>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto flex items-center justify-center bg-white rounded-2xl border border-gray-200 p-8">
        <svg
          viewBox="0 0 500 320"
          width="100%"
          style={{ maxWidth: '600px', display: 'block' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke="#000" strokeWidth="2" fill="none">
            {/* ── 1. 입력 포트 및 분기점 (Dot) ─────────────────────────────────────────── */}
            {/* A 입력 및 하단 분기 */}
            <line x1="40" y1="70" x2="120" y2="70" />
            <polyline points="60,70 60,220 120,220" strokeLinejoin="miter" />
            <circle cx="60" cy="70" r="4" fill="#000" stroke="none" />

            {/* B 입력 및 하단 분기 */}
            <line x1="40" y1="90" x2="120" y2="90" />
            <polyline points="80,90 80,240 120,240" strokeLinejoin="miter" />
            <circle cx="80" cy="90" r="4" fill="#000" stroke="none" />

            {/* C 입력선 (수평 연장) */}
            <line x1="40" y1="130" x2="240" y2="130" />

            {/* ── 2. 게이트 간 중간 연결 경로 ──────────────────────────────────────────── */}
            {/* 상단: AND1 -> AND2 */}
            <polyline points="164,80 200,80 200,110 240,110" />

            {/* 하단: NOT1, NOT2 -> AND3 */}
            <line x1="148" y1="220" x2="240" y2="220" />
            <line x1="148" y1="240" x2="240" y2="240" />

            {/* 최종 출력 병합: AND2, AND3 -> OR */}
            <polyline points="284,120 320,120 320,165 360,165" />
            <polyline points="284,230 320,230 320,185 360,185" />

            {/* OR -> X (출력) */}
            <line x1="404" y1="175" x2="450" y2="175" />
          </g>

          {/* ── 3. 논리 게이트 배치 ───────────────────────────────────────────────────── */}
          {/* 상단 경로 (A*B*C 도출) */}
          <AndGate x={120} y={80} />
          <AndGate x={240} y={120} />

          {/* 하단 경로 (!A*!B 도출) */}
          <NotGate x={120} y={220} />
          <NotGate x={120} y={240} />
          <AndGate x={240} y={230} />

          {/* 최종 OR 게이트 */}
          <OrGate x={360} y={175} />

          {/* ── 4. 텍스트 라벨 (입출력) ───────────────────────────────────────────────── */}
          <g fill="#000" fontSize="18" fontFamily="Arial, sans-serif" fontWeight="bold">
            <text x="15" y="76">A</text>
            <text x="15" y="96">B</text>
            <text x="15" y="136">C</text>
            <text x="460" y="181">X</text>
          </g>
        </svg>
      </div>
    </div>
  );
};
