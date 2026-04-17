import React, { useState, useEffect } from 'react';
import { KMapGroup } from '../lib/KMapLogic';

interface CircuitDiagramProps {
  groups: KMapGroup[];
  varCount: number;
}

export const CircuitDiagram: React.FC<CircuitDiagramProps> = ({ groups, varCount }) => {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groups.length === 0) {
      setSvgContent(null);
      return;
    }

    const fetchCircuit = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/circuit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ groups, varCount }),
        });

        if (!response.ok) {
          const errData = await response.json();
          if (errData.svg) {
            setSvgContent(errData.svg);
          }
          throw new Error(errData.error || 'Failed to fetch circuit');
        }

        const data = await response.json();
        setSvgContent(data.svg);
      } catch (err: any) {
        console.error('Fetch Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCircuit();
  }, [groups, varCount]);

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

  return (
    <div className="w-full overflow-hidden rounded-[40px] border border-[var(--border-color)] bg-white p-4 sm:p-8 shadow-sm">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">Schemdraw Powered Circuit</h3>
          <p className="text-[10px] text-[var(--text-muted)] font-medium">Professional Python schemdraw Rendering</p>
        </div>
        <div className="flex gap-3 text-[10px] font-mono font-bold bg-[var(--sidebar-bg)] px-3 py-1.5 rounded-full border border-[var(--border-color)]">
          <span className="text-[var(--accent-olive)]">{groups.length} TERMS</span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto min-h-[400px] flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[var(--accent-olive)] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono font-medium text-[var(--text-muted)]">Generating professional circuit...</p>
          </div>
        ) : error ? (
          <div className="text-center p-8 max-w-md">
            <p className="text-red-500 font-bold mb-2">Wait! Python integration required.</p>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <p className="text-[10px] text-slate-400">Make sure schemdraw is installed in the environment (System initializing...).</p>
          </div>
        ) : (
          <div 
            className="w-full flex justify-center p-4 transition-opacity duration-500 opacity-100 circuit-svg-container"
            dangerouslySetInnerHTML={{ __html: svgContent || '' }}
          />
        )}
      </div>
    </div>
  );
};
