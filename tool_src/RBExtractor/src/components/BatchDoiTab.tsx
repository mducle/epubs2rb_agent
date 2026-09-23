import React, { useState } from 'react';
import { Layers, Loader2, Download, Copy, Check, ExternalLink, Award, AlertCircle, Sparkles } from 'lucide-react';
import { RBScanMatch } from '../utils/rbScanner';

interface BatchPaperResult {
  doi: string;
  doiUrl: string;
  title: string;
  authors?: string[];
  journal?: string;
  year?: string;
  matchesCount: number;
  hasExactAllocationPhrase: boolean;
  matches: RBScanMatch[];
  error?: string;
}

export const BatchDoiTab: React.FC = () => {
  const [batchInput, setBatchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<BatchPaperResult[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<BatchPaperResult | null>(null);

  const sampleBatch = [
    '10.1038/s41467-022-31842-x',
    '10.5286/edata/isis/r/rb1810012',
    '10.1021/acs.chemmater.1c02891',
    '10.1103/PhysRevB.104.144405',
    '10.1016/j.jallcom.2021.159876',
  ];

  const handleRunBatch = async () => {
    const rawLines = batchInput
      .split(/[\n,;]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 3);

    if (rawLines.length === 0) return;

    setLoading(true);
    setProgress({ done: 0, total: rawLines.length });
    setResults([]);
    setSelectedPaper(null);

    try {
      const response = await fetch('/api/search-batch-dois', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dois: rawLines }),
      });

      if (!response.ok) {
        throw new Error('Batch search failed on server');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleBatch = () => {
    setBatchInput(sampleBatch.join('\n'));
  };

  const handleExportBatchCsv = () => {
    if (results.length === 0) return;
    const headers = ['DOI', 'Title', 'Journal', 'Year', 'RB Proposals Found', 'Exact Phrase Detected', 'Matches Count'];
    const rows = results.map((r) => {
      const rbs = Array.from(new Set(r.matches.map((m: any) => m.rbNumber))).join('; ');
      return [
        `"${r.doi}"`,
        `"${(r.title || '').replace(/"/g, '""')}"`,
        `"${(r.journal || '').replace(/"/g, '""')}"`,
        `"${r.year || ''}"`,
        `"${rbs}"`,
        r.hasExactAllocationPhrase ? 'YES' : 'NO',
        r.matchesCount,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `beamtime_batch_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregate stats
  const totalRBs = results.reduce((acc, r) => acc + r.matchesCount, 0);
  const papersWithRBs = results.filter((r) => r.matchesCount > 0).length;
  const papersWithExactPhrase = results.filter((r) => r.hasExactAllocationPhrase).length;

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-800 flex items-center">
            <Layers className="w-4 h-4 mr-1.5 text-indigo-600" />
            Batch DOI Inspector (Audit Multiple Publications)
          </label>
          <button
            type="button"
            onClick={handleLoadSampleBatch}
            className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Load Sample DOIs
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Paste a list of DOIs (one per line or separated by commas). Ideal for annual facility reporting, beamline citation audits, or Researchfish validation.
        </p>

        <textarea
          rows={5}
          value={batchInput}
          onChange={(e) => setBatchInput(e.target.value)}
          placeholder={`10.1038/s41467-022-31842-x\n10.5286/edata/isis/r/rb1810012\n10.1021/acs.chemmater.1c02891`}
          className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
        />

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {batchInput.split(/[\n,;]+/).filter((l) => l.trim().length > 3).length} DOIs entered (Max 25 per batch)
          </span>

          <button
            onClick={handleRunBatch}
            disabled={loading || !batchInput.trim()}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Auditing DOIs...
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                Run Batch Audit
              </>
            )}
          </button>
        </div>
      </div>

      {/* Batch Overview Cards */}
      {results.length > 0 && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Audit Results: {results.length} Publications Scanned
              </h3>
              <p className="text-xs text-slate-500">
                Found {totalRBs} proposal references across {papersWithRBs} papers.
              </p>
            </div>

            <button
              onClick={handleExportBatchCsv}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export Audit CSV
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <div className="text-lg font-bold text-slate-900">{results.length}</div>
              <div className="text-[11px] text-slate-500">Papers Scanned</div>
            </div>
            <div className="p-2.5 bg-indigo-50/70 rounded-lg border border-indigo-100 text-center">
              <div className="text-lg font-bold text-indigo-900">{papersWithRBs}</div>
              <div className="text-[11px] text-indigo-700">Papers with RB Mentions</div>
            </div>
            <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200 text-center">
              <div className="text-lg font-bold text-emerald-900">{papersWithExactPhrase}</div>
              <div className="text-[11px] text-emerald-700">Confirmed Beamtime Phrases</div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">DOI / Title</th>
                  <th className="p-3">Year</th>
                  <th className="p-3">Proposals (RB)</th>
                  <th className="p-3">Beamtime Allocation Phrase</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {results.map((r, i) => {
                  const uniqueRbs = Array.from(new Set(r.matches.map((m: any) => m.rbNumber)));
                  return (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 max-w-xs">
                        <div className="font-medium text-slate-900 truncate" title={r.title}>
                          {r.title}
                        </div>
                        <div className="font-mono text-indigo-600 text-[11px] truncate">
                          {r.doi}
                        </div>
                      </td>
                      <td className="p-3 text-slate-500">{r.year || '—'}</td>
                      <td className="p-3">
                        {uniqueRbs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {uniqueRbs.map((rb) => (
                              <span
                                key={rb}
                                className="font-mono font-bold px-1.5 py-0.5 rounded text-[11px] bg-slate-900 text-white"
                              >
                                {rb}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None detected</span>
                        )}
                      </td>
                      <td className="p-3">
                        {r.hasExactAllocationPhrase ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Award className="w-3 h-3 mr-1" />
                            Confirmed
                          </span>
                        ) : uniqueRbs.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            General mention
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <a
                          href={r.doiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-900 p-1"
                          title="Open DOI URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
