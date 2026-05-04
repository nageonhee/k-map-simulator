import matplotlib
matplotlib.use('Agg')

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import schemdraw
import schemdraw.elements as elm
from schemdraw.elements import logic as logic_gates  # 게이트 전용
import re

app = FastAPI()

class Group(BaseModel):
    expression: str

class CircuitRequest(BaseModel):
    groups: List[Group]
    varCount: int

@app.post("/generate-circuit")
async def generate_circuit(request: CircuitRequest):
    groups = request.groups
    var_count = request.varCount
    
    try:
        with schemdraw.Drawing() as d:
            d.config(unit=0.5, fontsize=12)
            
            vars = ['A', 'B', 'C', 'D', 'E'][:var_count]
            bus_x = [i * 2.5 for i in range(var_count)]
            
            gate_count = len([g for g in groups if g.expression not in ["1", "0"]])
            bus_bottom = -(gate_count * 5 + 4)
            
            for i, v in enumerate(vars):
                x = bus_x[i]
                d += elm.Line().at((x, 0.5)).to((x, bus_bottom)).color('#e2e8f0')
                d += elm.Label(label=v).at((x, 1.0))

            and_outputs = []
            valid_idx = 0
            
            for g in groups:
                expr = g.expression
                if expr in ["1", "0"]:
                    continue
                
                parts = re.findall(r"[A-E]'?", expr)
                literals = [{'var': p[0], 'inverted': p.endswith("'")} for p in parts]

                gate_y = -(valid_idx * 5 + 3)
                gate = d.add(elm.Gate(inputs=len(literals), gatetype='and').at((12, gate_y)))
                
                # ✅ 수정: for g 루프 안에 올바르게 들여쓰기
                for i_idx, lit in enumerate(literals):
                    v_idx = vars.index(lit['var'])
                    b_x = bus_x[v_idx]
                    in_pos = getattr(gate, f'IN{i_idx+1}')
        
                    d += elm.Dot().at((b_x, in_pos.y))
        
                    if lit['inverted']:
                        d += elm.Line().at((b_x, in_pos.y)).to((b_x + 1.5, in_pos.y))
                        not_gate = d.add(elm.Gate(inputs=1, gatetype='not')
                                         .at((b_x + 1.5, in_pos.y)).right())
                        d += elm.Line().at(not_gate.OUT).to(in_pos)
                    else:
                        d += elm.Line().at((b_x, in_pos.y)).to(in_pos)

                and_outputs.append(gate.OUT)
                valid_idx += 1

            if len(and_outputs) > 1:
                or_x = 22
                total_h = (valid_idx * 5 + 3)
                or_y = -total_h / 2
                or_gate = d.add(elm.Gate(inputs=len(and_outputs), gatetype='or')
                                .at((or_x, or_y)))
                
                # ✅ 수정: if 블록 안에 올바르게 들여쓰기
                for i_idx, out_pos in enumerate(and_outputs):
                    target_pos = getattr(or_gate, f'IN{i_idx+1}')
                    mid_x = or_x - 4
                    d += elm.Line().at(out_pos).to((mid_x, out_pos.y))
                    d += elm.Line().to((mid_x, target_pos.y))
                    d += elm.Line().to(target_pos)
                
                d += elm.Line().at(or_gate.OUT).length(2).label('F', 'right')
                
            elif len(and_outputs) == 1:
                d += elm.Line().at(and_outputs[0]).length(6).label('F', 'right')
            
            svg_data = d.get_imagedata('svg').decode('utf-8')
            svg_data = re.sub(r'width="\d+(?:\.\d+)?pt"', '', svg_data)
            svg_data = re.sub(r'height="\d+(?:\.\d+)?pt"', '', svg_data)
            
            return {"svg": svg_data}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
