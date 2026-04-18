import matplotlib
matplotlib.use('Agg')

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import schemdraw
from schemdraw import elements
from schemdraw import logic
import re
import io

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
            
            # 1. Define Variable Buses (Vertical lines)
            vars = ['A', 'B', 'C', 'D', 'E'][:var_count]
            bus_x = [i * 2.5 for i in range(var_count)]
            
            # Calculate dynamic dimensions
            gate_count = len([g for g in groups if g.expression not in ["1", "0"]])
            bus_bottom = - (gate_count * 5 + 4)
            
            for i, v in enumerate(vars):
                x = bus_x[i]
                d += logic.Line().at((x, 0.5)).to((x, bus_bottom)).color('#e2e8f0')
                d += elements.Label(label=v).at((x, 1.0))

            # 2. Logic Gates (AND stage)
            and_outputs = []
            valid_idx = 0
            for g in groups:
                expr = g.expression
                if expr in ["1", "0"]: continue
                
                # Parse literals
                parts = re.findall(r"[A-E]'?", expr)
                literals = [{'var': p[0], 'inverted': p.endswith("'")} for p in parts]

                gate_y = - (valid_idx * 5 + 3)
                gate = d.add(logic.And(n=len(literals)).at((12, gate_y)))
                
                for i_idx, lit in enumerate(literals):
                    v_idx = vars.index(lit['var'])
                    b_x = bus_x[v_idx]
                    
                    # Input anchor
                    anchor_name = 'in%d' % (i_idx + 1)
                    in_pos = gate.absanchors[anchor_name]
                    
                    # Dot on bus
                    d += logic.Dot().at((b_x, in_pos.y))
                    
                    # Route from bus to gate input
                    if lit['inverted']:
                        d += logic.Line().at((b_x, in_pos.y)).to((b_x + 1.5, in_pos.y))
                        not_gate = d.add(logic.Not().at((b_x + 1.5, in_pos.y)).right().scale(0.6))
                        d += logic.Line().at(not_gate.out).to(in_pos)
                    else:
                        d += logic.Line().at((b_x, in_pos.y)).to(in_pos)
                
                and_outputs.append(gate.out)
                valid_idx += 1

            # 3. Final OR Stage (Aggregate)
            if len(and_outputs) > 1:
                or_x = 22
                total_h = (valid_idx * 5 + 3)
                or_y = - total_h / 2
                or_gate = d.add(logic.Or(n=len(and_outputs)).at((or_x, or_y)))
                
                for i_idx, out_pos in enumerate(and_outputs):
                    in_node = 'in%d' % (i_idx + 1)
                    target_pos = or_gate.absanchors[in_node]
                    
                    # Clean orthogonal routing
                    mid_x = or_x - 4
                    d += logic.Line().at(out_pos).to((mid_x, out_pos.y))
                    d += logic.Line().to((mid_x, target_pos.y))
                    d += logic.Line().to(target_pos)
                
                d += logic.Line().at(or_gate.out).length(2).label('F', 'right')
            elif len(and_outputs) == 1:
                d += logic.Line().at(and_outputs[0]).length(6).label('F', 'right')
            
            svg_data = d.get_imagedata('svg').decode('utf-8')
            
            # Clean up width/height for responsiveness if needed
            svg_data = re.sub(r'width="\d+(?:\.\d+)?pt"', '', svg_data)
            svg_data = re.sub(r'height="\d+(?:\.\d+)?pt"', '', svg_data)
            
            return {"svg": svg_data}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
