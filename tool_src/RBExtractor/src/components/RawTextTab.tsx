import React, { useState } from 'react';
import { FileText, Sparkles, Filter, Trash2 } from 'lucide-react';
import { scanTextForRB, RBScanMatch } from '../utils/rbScanner';
import { ResultCard } from './ResultCard';
import { SummaryBar } from './SummaryBar';
import { SAMPLE_PRESETS, SampleDoc } from '../data/sampleData';

export const RawTextTab: React.FC = () => {
  const [inputText, setInputText] = useState(SAMPLE_PRESETS[0].content || '');
  const [docTitle, setDocTitle] = useState(SAMPLE_PRESETS[0].title);
  const [strictDigits, setStrictDigits] = useState(false);
  const [matches, setMatches] = useState<RBScanMatch[]>(() =>
    scanTextForRB(SAMPLE_PRESETS[0].content || '', { strictSevenDigits: false })
  );
  const [activeFilter, setActiveFilter] = useState<'all' | 'exact' | 'allocation'>('all');

  const handleScan = (textToScan: string, strict: boolean) => {
    const res = scanTextForRB(textToScan, {
      strictSevenDigits: strict,
      sourceName: docTitle || 'Direct Text',
    });
    setMatches(res);
  };

  const handleSelectPreset = (preset: SampleDoc) => {
    if (preset.content) {
      setInputText(preset.content);
      setDocTitle(preset.title);
      handleScan(preset.content, strictDigits);
    }
  };

  const handleTextChange = (val: string) => {
    setInputText(val);
    handleScan(val, strictDigits);
  };

  const handleClear = () => {
    setInputText('');
    setDocTitle('Custom Text');
    setMatches([]);
  };

  // Export handlers
  const handleExportCsv = () => {
    if (matches.length === 0) return;
    const headers = ['Document', 'RB Proposal', 'Category', 'Exact Phrase', 'Section', 'Context'];
    const rows = matches.map((m) => [
      `"${docTitle}"`,
      `"${m.rbNumber}"`,
      `"${m.categoryLabel}"`,
      m.isExactUserPhrase ? 'YES' : 'NO',
      `"${m.sectionHint}"`,
      `"${m.snippet.fullSentence.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `beamtime_matches_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    const data = {
      title: docTitle,
      matches,
      scannedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `beamtime_matches_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMatches = matches.filter((m) => {
    if (activeFilter === 'exact') return m.isExactUserPhrase || m.category === 'exact_supported';
    if (activeFilter === 'allocation') return m.category === 'allocation_phrase';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Input Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label className="text-sm font-semibold text-slate-800 flex items-center">
            <FileText className="w-4 h-4 mr-1.5 text-indigo-600" />
            Direct Manuscript / Acknowledgement Text Scanner
          </label>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleClear}
              className="inline-flex items-center text-xs text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
          <span className="font-medium text-slate-500 flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Test Sample Manuscripts:
          </span>
          {SAMPLE_PRESETS.filter((p) => p.content).map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`px-2.5 py-1 rounded text-xs transition-colors border ${
                docTitle === preset.title
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {preset.title.split('(')[0].trim()}
            </button>
          ))}
        </div>

        <textarea
          rows={7}
          value={inputText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={`Paste research paper text, funding acknowledgements, or references here...\n\nExample:\n"This study was supported by beamtime allocation RB1910243 at the ISIS Neutron and Muon Source."`}
          className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white leading-relaxed"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <label className="inline-flex items-center cursor-pointer select-none text-slate-600">
            <input
              type="checkbox"
              checked={strictDigits}
              onChange={(e) => {
                setStrictDigits(e.target.checked);
                handleScan(inputText, e.target.checked);
              }}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mr-2"
            />
            Strict 7-digit proposal format (<code className="font-mono text-slate-700">RB#######</code>)
          </label>

          <span className="text-slate-400">
            {inputText.length} characters • {matches.length} proposal matches
          </span>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      {matches.length > 0 && (
        <SummaryBar
          matches={matches}
          sourceTitle={docTitle}
          sourceType="Direct Text Input"
          onExportCsv={handleExportCsv}
          onExportJson={handleExportJson}
        />
      )}

      {/* Matches List */}
      {matches.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <h3 className="font-semibold text-slate-900 text-sm">
              Detected Proposals &amp; Acknowledgements ({filteredMatches.length})
            </h3>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-400 mr-1 flex items-center">
                <Filter className="w-3.5 h-3.5 mr-1" />
                Filter:
              </span>
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({matches.length})
              </button>
              <button
                onClick={() => setActiveFilter('exact')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeFilter === 'exact'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Exact Phrases ({matches.filter((m) => m.isExactUserPhrase || m.category === 'exact_supported').length})
              </button>
              <button
                onClick={() => setActiveFilter('allocation')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeFilter === 'allocation'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                Allocation Mentions ({matches.filter((m) => m.category === 'allocation_phrase').length})
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {filteredMatches.map((match, idx) => (
              <ResultCard key={match.id} match={match} index={idx} />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-base font-semibold text-slate-800">
            No RB Matches in Current Text
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            Enter or paste text containing references of the form{' '}
            <code className="font-mono text-slate-700">RB#######</code> or acknowledgements like{' '}
            <code className="font-mono text-emerald-700">"supported by beamtime allocation RB#######"</code>.
          </p>
        </div>
      )}
    </div>
  );
};
