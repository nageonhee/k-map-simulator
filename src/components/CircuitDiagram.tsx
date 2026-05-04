import React, { useMemo } from 'react';
import { KMapGroup } from '../lib/KMapLogic';

interface CircuitDiagramProps {
  groups: KMapGroup[];
  varCount: number;
}

// ── Layout Constants ────────────────────────────────────────────────────────────
const PAD_L        = 52;   // left padding
const PAD_T        = 52;   // top padding (room for var labels)
const BUS_SPACING  = 60;   // horizontal gap between variable buses
const INPUT_PITCH  = 20;   // vertical spacing between gate inputs
const GATE_GAP     = 38;   // vertical gap between consecutive AND gates
const FLAT_W       = 24;   // flat (non-arc) width of AND gate left section
const NOT_R        = 5;    // radius of NOT inversion bubble
const NOT_STUB     = 16;   // length of wire from bus to NOT bubble

// ── Helpers ─────────────────────────────────────────────────────────────────────
function parseLiterals(expr: string) {
  return [...expr.matchAll(/([A-E])'?/g)].map(m => ({
    variable: m[1],
    inverted: m[0].endsWith("'"),
  }));
}

// ── Gate Components ─────────────────────────────────────────────────────────────

/** AND gate: flat left edge, semicircular right */
function AndGate({ x, y, h }: { x: number; y: number; h: number }) {
  const r = h / 2;
  return (
    <>
      <path
        d={`M ${x},${y - r}
            L ${x + FLAT_W},${y - r}
            A ${r} ${r} 0 0 1 ${x + FLAT_W},${y + r}
            L ${x},${y + r} Z`}
        fill="#FDFCF8" stroke="#5A5A40" strokeWidth="1.8"
      />
      {/* Ampersand label */}
      <text
        x={x + FLAT_W / 2} y={y + 4.5}
        textAnchor="middle" fill="#8C9681"
        fontSize="10" fontFamily="'JetBrains Mono', monospace"
        fontWeight="700"
      >&amp;</text>
    </>
  );
}

/** OR gate: curved left, pointed right */
function OrGate({ x, y, h }: { x: number; y: number; h: number }) {
  const r  = h / 2;
  const dx = h * 0.26; // left-curve control point offset
  return (
    <>
      <path
        d={`M ${x},${y - r}
            Q ${x + dx},${y} ${x},${y + r}
            Q ${x + FLAT_W + r * 0.65},${y + r} ${x + FLAT_W + r},${y}
            Q ${x + FLAT_W + r * 0.65},${y - r} ${x},${y - r} Z`}
        fill="#FDFCF8" stroke="#5A5A40" strokeWidth="1.8"
      />
      {/* ≥1 label */}
      <text
        x={x + dx / 2 + FLAT_W * 0.35} y={y + 4.5}
        textAnchor="middle" fill="#8C9681"
        fontSize="10" fontFamily="'JetBrains Mono', monospace"
        fontWeight="700"
      >≥1</text>
    </>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────
export const CircuitDiagram: React.FC<CircuitDiagramProps> = ({ groups, varCount }) => {

  // Empty state (matches original)
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-[var(--text-muted)] italic gap-2 bg-white rounded-[40px] border border-[var(--border-color)]">
        <div className="w-16 h-16 rounded-full bg-[var(--background)] flex items-center justify-center mb-2">
          <span className="text-3xl not-italic">?</span>
        </div>
        <p className="font-medium">No logic gates to display</p>
        <p className="text-xs opacity-60">Add some '1's to generate a circuit</p>
      </div>
    );
  }

  const varNames     = ['A', 'B', 'C', 'D', 'E'].slice(0, varCount);
  const validGroups  = groups.filter(g => g.expression && !['0', '1'].includes(g.expression.trim()));
  const N            = validGroups.length;

  // ── Bus x positions ──────────────────────────────────────────────────────────
  const busX: Record<string, number> = {};
  varNames.forEach((v, i) => { busX[v] = PAD_L + i * BUS_SPACING; });

  // AND gate left-edge x
  const AND_X = PAD_L + varCount * BUS_SPACING + 32;

  // ── AND gate layout ──────────────────────────────────────────────────────────
  const andGates = useMemo(() => {
    let cursorY = PAD_T;
    return validGroups.map((g) => {
      const lits = parseLiterals(g.expression);
      const n    = lits.length;
      const gh   = Math.max(44, n * INPUT_PITCH + 14); // gate height
      const cy   = cursorY + gh / 2;
      cursorY   += gh + GATE_GAP;

      const r     = gh / 2;                    // semicircle radius
      const outX  = AND_X + FLAT_W + r;        // output x (rightmost point of arc)
      const outY  = cy;

      // Input anchor positions along the flat left edge
      const span   = (n - 1) * INPUT_PITCH;
      const inputs = lits.map((lit, i) => ({
        ...lit,
        gateX: AND_X,
        gateY: cy - span / 2 + i * INPUT_PITCH,
      }));

      return { lits, n, gh, cy, outX, outY, inputs };
    });
  }, [validGroups, varCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalH  = andGates.reduce((acc, g) => acc + g.gh + GATE_GAP, 0) - GATE_GAP;
  const busBotY = PAD_T + totalH + 30;

  // ── OR gate layout ───────────────────────────────────────────────────────────
  const maxAndOutX  = andGates.length ? Math.max(...andGates.map(g => g.outX)) : AND_X + 60;
  const OR_X        = maxAndOutX + 55;
  const orGateH     = Math.max(44, N * INPUT_PITCH + 14);
  const orGateCY    = PAD_T + totalH / 2;
  const orR         = orGateH / 2;
  const orGateOutX  = OR_X + FLAT_W + orR;

  // OR gate input y positions (evenly distributed)
  const orInputSpan = (N - 1) * INPUT_PITCH;
  const orInputYs   = andGates.map((_, i) => orGateCY - orInputSpan / 2 + i * INPUT_PITCH);

  // SVG canvas size
  const svgW = orGateOutX + 80;
  const svgH = busBotY + 20;

  return (
    <div className="w-full overflow-hidden rounded-[40px] border border-[var(--border-color)] bg-white p-4 sm:p-8 shadow-sm">

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
            Logic Circuit Diagram
          </h3>
          <p className="text-[10px] text-[var(--text-muted)] font-medium">
            SOP Form · Inline SVG Rendering
          </p>
        </div>
        <div className="flex gap-3 text-[10px] font-mono font-bold bg-[var(--sidebar-bg)] px-3 py-1.5 rounded-full border border-[var(--border-color)]">
          <span className="text-[var(--accent-olive)]">{N} TERM{N !== 1 ? 'S' : ''}</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto min-h-[200px] flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 circuit-svg-container">
        {N === 0 ? (
          <p className="text-xs text-slate-400 italic">No valid SOP terms to render.</p>
        ) : (
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            width="100%"
            style={{ maxHeight: 560, display: 'block' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* ── Variable Bus Lines ─────────────────────────────────────────── */}
            {varNames.map(v => (
              <g key={`bus-${v}`}>
                <line
                  x1={busX[v]} y1={PAD_T - 14}
                  x2={busX[v]} y2={busBotY}
                  stroke="#D6D6CC" strokeWidth="1.6"
                />
                {/* Variable label */}
                <text
                  x={busX[v]} y={PAD_T - 22}
                  textAnchor="middle" fill="#5A5A40"
                  fontSize="14" fontFamily="'JetBrains Mono', monospace"
                  fontWeight="700"
                >{v}</text>
              </g>
            ))}

            {/* ── AND Gates + Input Wires ────────────────────────────────────── */}
            {andGates.map((gate, gIdx) => {
              const { gh, cy, outX, outY, inputs } = gate;

              return (
                <g key={`and-${gIdx}`}>

                  {/* AND gate shape */}
                  <AndGate x={AND_X} y={cy} h={gh} />

                  {/* Single-group output wire (no OR gate) */}
                  {N === 1 && (
                    <line
                      x1={outX} y1={outY}
                      x2={outX + 44} y2={outY}
                      stroke="#5A5A40" strokeWidth="1.8"
                    />
                  )}

                  {/* Input wires bus → AND gate */}
                  {inputs.map((inp, iIdx) => {
                    const bx = busX[inp.variable];

                    if (inp.inverted) {
                      // ① straight wire: bus dot → NOT bubble left edge
                      const bubCX  = bx + NOT_STUB + NOT_R;
                      const wireEnd = bubCX + NOT_R; // right edge of bubble

                      return (
                        <g key={`inp-${gIdx}-${iIdx}`}>
                          {/* bus tap dot */}
                          <circle cx={bx} cy={inp.gateY} r="3.2" fill="#8C9681" />
                          {/* bus → NOT bubble */}
                          <line
                            x1={bx} y1={inp.gateY}
                            x2={bubCX - NOT_R} y2={inp.gateY}
                            stroke="#8C9681" strokeWidth="1.4"
                          />
                          {/* NOT bubble (inversion circle) */}
                          <circle
                            cx={bubCX} cy={inp.gateY} r={NOT_R}
                            fill="#FDFCF8" stroke="#5A5A40" strokeWidth="1.5"
                          />
                          {/* NOT bubble → AND gate input */}
                          <line
                            x1={wireEnd} y1={inp.gateY}
                            x2={inp.gateX} y2={inp.gateY}
                            stroke="#5A5A40" strokeWidth="1.4"
                          />
                        </g>
                      );
                    }

                    return (
                      <g key={`inp-${gIdx}-${iIdx}`}>
                        {/* bus tap dot */}
                        <circle cx={bx} cy={inp.gateY} r="3.2" fill="#8C9681" />
                        {/* straight wire bus → AND gate */}
                        <line
                          x1={bx} y1={inp.gateY}
                          x2={inp.gateX} y2={inp.gateY}
                          stroke="#8C9681" strokeWidth="1.4"
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* ── OR Gate + Routing Wires (N > 1) ───────────────────────────── */}
            {N > 1 && (
              <g key="or-gate">
                <OrGate x={OR_X} y={orGateCY} h={orGateH} />

                {/* AND output → OR input orthogonal wires */}
                {andGates.map((gate, gIdx) => {
                  const midX = (gate.outX + OR_X) / 2;
                  const tgtY = orInputYs[gIdx];
                  return (
                    <polyline
                      key={`or-wire-${gIdx}`}
                      points={`
                        ${gate.outX},${gate.outY}
                        ${midX},${gate.outY}
                        ${midX},${tgtY}
                        ${OR_X},${tgtY}
                      `}
                      fill="none"
                      stroke="#8C9681" strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  );
                })}

                {/* OR gate output wire */}
                <line
                  x1={orGateOutX} y1={orGateCY}
                  x2={orGateOutX + 42} y2={orGateCY}
                  stroke="#5A5A40" strokeWidth="1.8"
                />
                {/* F label */}
                <text
                  x={orGateOutX + 52} y={orGateCY + 5}
                  fill="#5A5A40" fontSize="16"
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight="700"
                >F</text>
              </g>
            )}

            {/* ── Single-group F label ───────────────────────────────────────── */}
            {N === 1 && andGates[0] && (
              <text
                x={andGates[0].outX + 56} y={andGates[0].outY + 5}
                fill="#5A5A40" fontSize="16"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="700"
              >F</text>
            )}
          </svg>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {[
          { color: '#D6D6CC', label: 'Variable bus' },
          { color: '#8C9681', label: 'Signal wire' },
          { color: '#5A5A40', label: 'Gate / output' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div style={{ width: 18, height: 2, background: l.color, borderRadius: 1 }} />
            <span className="text-[10px] text-[var(--text-muted)] font-medium">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="5" fill="#FDFCF8" stroke="#5A5A40" strokeWidth="1.5" />
          </svg>
          <span className="text-[10px] text-[var(--text-muted)] font-medium">NOT (inversion)</span>
        </div>
      </div>
    </div>
  );
};
