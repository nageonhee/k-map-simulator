import matplotlib
matplotlib.use('Agg')

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import schemdraw
import schemdraw.elements as elm
from schemdraw.elements import logic as lgates  # And, Or, Not, Nand, Nor 등
import re

app = FastAPI()


# ── Request Models ──────────────────────────────────────────────────────────────

class Group(BaseModel):
    expression: str          # 예: "AB'C", "A'B", "1", "0"

class CircuitRequest(BaseModel):
    groups: List[Group]
    varCount: int            # 변수 개수 (1~5)


# ── Helpers ─────────────────────────────────────────────────────────────────────

def parse_literals(expr: str) -> list[dict]:
    """
    "AB'C" → [{'var':'A','inv':False}, {'var':'B','inv':True}, {'var':'C','inv':False}]
    """
    parts = re.findall(r"[A-E]'?", expr)
    return [{'var': p[0], 'inv': p.endswith("'")} for p in parts]


# ── Main Endpoint ────────────────────────────────────────────────────────────────

@app.post("/generate-circuit")
async def generate_circuit(request: CircuitRequest):
    groups   = request.groups
    var_count = min(max(request.varCount, 1), 5)

    # 상수(0/1)가 아닌 실제 게이트 그룹만 추림
    valid_groups = [g for g in groups if g.expression not in ("0", "1")]
    gate_count   = len(valid_groups)

    if gate_count == 0:
        raise HTTPException(status_code=400, detail="유효한 표현식이 없습니다.")

    try:
        with schemdraw.Drawing() as d:
            d.config(fontsize=11)

            # ── 레이아웃 상수 ───────────────────────────────────────────────
            GATE_STEP   = 3.0   # 게이트 간 수직 간격
            BUS_SPACING = 2.2   # 변수 버스 간 수평 간격
            AND_X       = 10.0  # AND 게이트 x 위치
            OR_X        = 17.0  # OR  게이트 x 위치

            var_names = ['A', 'B', 'C', 'D', 'E'][:var_count]
            bus_x     = {v: i * BUS_SPACING for i, v in enumerate(var_names)}

            # 전체 회로 높이 (버스 길이 결정)
            total_height = gate_count * GATE_STEP + GATE_STEP
            bus_top      = 1.0
            bus_bot      = -(total_height)

            # ── 1. 변수 버스 (수직선 + 라벨) ────────────────────────────────
            for v in var_names:
                x = bus_x[v]
                # 수직 버스선
                d += (elm.Line()
                        .at((x, bus_top))
                        .to((x, bus_bot))
                        .color('#94a3b8')
                        .linewidth(1.2))
                # 변수 이름 라벨
                d += elm.Label().at((x, bus_top + 0.5)).label(v, loc='center')

            # ── 2. AND 게이트 + 입력 배선 ───────────────────────────────────
            and_outputs: list = []   # 각 AND 게이트의 출력 좌표 보관

            for gate_idx, g in enumerate(valid_groups):
                literals = parse_literals(g.expression)
                n_inputs = len(literals)

                # AND 게이트 y 중심
                gate_y = -(gate_idx * GATE_STEP + GATE_STEP)

                # schemdraw 0.15+ : lgates.And(inputs=n)
                # anchor: IN1, IN2, ..., INn  /  OUT
                and_gate = d.add(
                    lgates.And(inputs=n_inputs)
                    .anchor('center')
                    .at((AND_X, gate_y))
                )

                # 각 입력 리터럴 배선
                for i_idx, lit in enumerate(literals):
                    # 입력 앵커: IN1, IN2, ...
                    in_anchor = getattr(and_gate, f'IN{i_idx + 1}')
                    bx        = bus_x[lit['var']]
                    wire_y    = in_anchor.y

                    if lit['inv']:
                        # NOT 게이트 삽입
                        # ① 버스 → NOT 입력
                        d += (elm.Line()
                                .at((bx, wire_y))
                                .right()
                                .length(BUS_SPACING * 0.4))
                        not_gate = d.add(
                            lgates.Not()
                            .anchor('IN1')
                            .at((bx + BUS_SPACING * 0.4, wire_y))
                        )
                        # ② 버스 탭 점
                        d += elm.Dot(open=False).at((bx, wire_y))
                        # ③ NOT 출력 → AND 입력
                        d += (elm.Line()
                                .at(not_gate.OUT)
                                .to(in_anchor))
                    else:
                        # 직선 연결
                        d += elm.Dot(open=False).at((bx, wire_y))
                        d += (elm.Line()
                                .at((bx, wire_y))
                                .to(in_anchor))

                and_outputs.append(and_gate.OUT)

            # ── 3. OR 게이트 (최종 합산) ────────────────────────────────────
            if gate_count > 1:
                or_center_y = -(total_height / 2)

                or_gate = d.add(
                    lgates.Or(inputs=gate_count)
                    .anchor('center')
                    .at((OR_X, or_center_y))
                )

                # AND 출력 → OR 입력 직각 배선
                for i_idx, out_pt in enumerate(and_outputs):
                    in_anchor = getattr(or_gate, f'IN{i_idx + 1}')
                    mid_x     = (out_pt.x + in_anchor.x) / 2   # 꺾임 x

                    d += (elm.Line()
                            .at(out_pt)
                            .to((mid_x, out_pt.y)))
                    d += (elm.Line()
                            .at((mid_x, out_pt.y))
                            .to((mid_x, in_anchor.y)))
                    d += (elm.Line()
                            .at((mid_x, in_anchor.y))
                            .to(in_anchor))

                # 출력 라벨 F
                d += (elm.Line()
                        .at(or_gate.OUT)
                        .right()
                        .length(1.5)
                        .label('F', loc='end'))

            else:
                # 그룹이 하나뿐 → AND 출력을 바로 F로
                d += (elm.Line()
                        .at(and_outputs[0])
                        .right()
                        .length(3.0)
                        .label('F', loc='end'))

            # ── 4. SVG 직렬화 ───────────────────────────────────────────────
            svg_bytes = d.get_imagedata('svg')
            svg_str   = svg_bytes.decode('utf-8')

            # 고정 크기 제거 → CSS로 반응형 제어 가능하게
            svg_str = re.sub(r'\swidth="\d+(?:\.\d+)?(?:pt|px)"',  '', svg_str)
            svg_str = re.sub(r'\sheight="\d+(?:\.\d+)?(?:pt|px)"', '', svg_str)

            return {"svg": svg_str}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Dev 실행 ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
