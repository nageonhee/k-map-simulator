import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);

async function startServer() {
  const app = express();
  const PORT = 8080;

  app.use(express.json());

  const pythonCmd = '/opt/venv/bin/python3';

  app.post('/api/circuit', async (req, res) => {
    const { groups, varCount } = req.body;
    
    // Create a temporary python file
    const tempPyFile = path.join(os.tmpdir(), `circuit_${Date.now()}.py`);
    const tempSvgFile = path.join(os.tmpdir(), `circuit_${Date.now()}.svg`);
    
    const pythonScript = `
import sys
import os
import json
import re
import schemdraw
from schemdraw import logic

groups = ${JSON.stringify(groups)}
var_count = ${varCount}

try:
    with schemdraw.Drawing(file='${tempSvgFile}') as d:
        d.config(unit=0.5, fontsize=12)
        
        # 1. Define Variable Buses (Vertical lines)
        vars = ['A', 'B', 'C', 'D'][:var_count]
        bus_x = [i * 2.5 for i in range(var_count)]
        
        # Calculate dynamic dimensions
        gate_count = len([g for g in groups if g['expression'] not in ["1", "0"]])
        bus_bottom = - (gate_count * 5 + 4)
        
        for i, v in enumerate(vars):
            x = bus_x[i]
            d += logic.Line().at((x, 0.5)).to((x, bus_bottom)).color('#e2e8f0')
            d += logic.Label().at((x, 1.0)).label(v)

        # 2. Logic Gates (AND stage)
        and_outputs = []
        valid_idx = 0
        for g in groups:
            expr = g['expression']
            if expr in ["1", "0"]: continue
            
            # Parse literals
            parts = re.findall(r"[A-D]'?", expr)
            literals = [{'var': p[0], 'inverted': p.endswith("'")} for p in parts]

            gate_y = - (valid_idx * 5 + 3)
            gate = d.add(logic.And(inputs=len(literals)).at((12, gate_y)))
            
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
            or_gate = d.add(logic.Or(inputs=len(and_outputs)).at((or_x, or_y)))
            
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
            
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
`;

    try {
      await fs.writeFile(tempPyFile, pythonScript);
      await execAsync(`${pythonCmd} ${tempPyFile}`);
      
      const svgOutput = (await fs.readFile(tempSvgFile, 'utf-8'))
        .replace(/width="\\d+(?:\\.\\d+)?pt"/, '')
        .replace(/height="\\d+(?:\\.\\d+)?pt"/, '');
      
      // Cleanup
      await fs.unlink(tempPyFile).catch(() => {});
      await fs.unlink(tempSvgFile).catch(() => {});
      
      res.setHeader('Content-Type', 'application/json');
      res.json({ svg: svgOutput });
    } catch (err: any) {
      console.error('PYTHON EXECUTION ERROR:', err);
      
      const errorSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
        <rect width="100%" height="100%" fill="#fee2e2" />
        <text x="20" y="40" font-family="sans-serif" font-size="16" fill="#b91c1c" font-weight="bold">
          파이썬 실행 에러 발생 (생성 실패):
        </text>
        <text x="20" y="70" font-family="monospace" font-size="12" fill="#7f1d1d">
          ${err.message.replace(/</g, '&lt;').replace(/>/g, '&gt;').split('\n').slice(0, 10).join('\n')}
        </text>
      </svg>`;
      
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ svg: errorSvg, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
