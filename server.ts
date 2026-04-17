import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const FASTAPI_URL = 'http://localhost:8000/generate-circuit';

  app.use(express.json());

  app.post('/api/circuit', async (req, res) => {
    const { groups, varCount } = req.body;
    
    try {
      const response = await axios.post(FASTAPI_URL, { groups, varCount });
      const svgOutput = response.data.svg;
      
      res.setHeader('Content-Type', 'application/json');
      res.json({ svg: svgOutput });
    } catch (err: any) {
      console.error('FASTAPI CONNECTION ERROR:', err.message);
      
      const errorMessage = err.response?.data?.detail || err.message;
      const errorSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
        <rect width="100%" height="100%" fill="#fee2e2" />
        <text x="20" y="40" font-family="sans-serif" font-size="16" fill="#b91c1c" font-weight="bold">
          회로 생성 에러 (FastAPI 통신 실패):
        </text>
        <text x="20" y="70" font-family="monospace" font-size="12" fill="#7f1d1d">
          ${errorMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </text>
      </svg>`;
      
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ svg: errorSvg, error: errorMessage });
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
