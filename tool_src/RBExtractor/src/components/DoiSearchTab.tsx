import React, { useState } from 'react';
import { Search, Loader2, BookOpen, AlertCircle, ExternalLink, Sparkles, Filter } from 'lucide-react';
import { RBScanMatch, scanTextForRB } from '../utils/rbScanner';
import { ResultCard } from './ResultCard';
import { SummaryBar } from './SummaryBar';
import { SAMPLE_PRESETS } from '../data/sampleData';

export const DoiSearchTab: React.FC = () => {
  const [doiInput, setDoiInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [paperInfo, setPaperInfo] = useState<{
    doi: string;
    doiUrl: string;
    title: string;
    authors: string[];
    journal: string;
    year: string;
    publisher: string;
    landingPageUrl?: string;
    openAccessPdfUrl?: string;
    fullTextSource?: string;
  } | null>(null);

  const [matches, setMatches] = useState<RBScanMatch[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'exact' | 'allocation' | 'general'>('all');
  const [strictDigits, setStrictDigits] = useState(false);

  const handleSearchDoi = async (doiToSearch?: string) => {
    const target = (doiToSearch || doiInput).trim();
    if (!target) {
      setError('Please enter a DOI or DOI URL to inspect');
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingStage('Resolving DOI & fetching publication metadata...');
    setPaperInfo(null);
    setMatches([]);

    try {
      // Call backend API
      const response = await fetch('/api/search-doi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doiInput: target }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      setLoadingStage('Scanning text layer & acknowledgements for RB references...');
      const data = await response.json();

      setPaperInfo({
        doi: data.doi,
        doiUrl: data.doiUrl,
        title: data.title || target,
        authors: data.authors || [],
        journal: data.journal || '',
        year: data.year ? String(data.year) : '',
        publisher: data.publisher || '',
        landingPageUrl: data.landingPageUrl,
        openAccessPdfUrl: data.openAccessPdfUrl,
        fullTextSource: data.fullTextSource,
      });

      // Transform backend matches to scan matches
      const rawMatches: RBScanMatch[] = (data.matches || []).map((m: any, idx: number) => ({
        id: `doi-${m.rbNumber}-${idx}`,
        rbNumber: m.rbNumber,
        rawMatch: m.rawMatch,
        category: m.phraseType,
        categoryLabel:
          m.phraseType === 'exact_supported'
            ? 'Exact Phrase: "supported by beamtime allocation RB#######"'
            : m.phraseType === 'allocation_phrase'
            ? 'Beamtime Allocation Mention'
            : m.phraseType === 'facility_context'
            ? 'Facility & Acknowledgement Reference'
            : 'General RB Reference',
        confidence: m.phraseType === 'exact_supported' ? 'high' : 'medium',
        isExactUserPhrase: m.exactPhraseDetected,
        facility: /isis/i.test(m.phraseSnippet)
          ? 'ISIS Neutron and Muon Source (STFC RAL)'
          : /diamond/i.test(m.phraseSnippet)
          ? 'Diamond Light Source'
          : 'Research Facility',
        sectionHint: m.sectionHint || 'Publication Text / Metadata',
        pageNumber: m.pageNumber,
        snippet: {
          before: '',
          target: m.rawMatch,
          after: '',
          fullSentence: m.fullSentence || m.phraseSnippet,
        },
      }));

      // Apply strict 7-digits filter if toggled
      const filtered = strictDigits
        ? rawMatches.filter((m) => /^RB\d{7}$/i.test(m.rbNumber))
        : rawMatches;

      setMatches(filtered);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to search DOI. Please verify format.');
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleApplyPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    if (preset.doi) {
      setDoiInput(preset.doi);
      handleSearchDoi(preset.doi);
    } else if (preset.content) {
      setDoiInput(preset.doi || '10.1038/s41467-022-31842-x');
      handleSearchDoi(preset.doi || '10.1038/s41467-022-31842-x');
    }
  };

  // Export handlers
  const handleExportCsv = () => {
    if (matches.length === 0) return;
    const headers = ['DOI', 'Paper Title', 'RB Proposal', 'Category', 'Exact Phrase', 'Section', 'Sentence Context'];
    const rows = matches.map((m) => [
      `"${paperInfo?.doi || ''}"`,
      `"${(paperInfo?.title || '').replace(/"/g, '""')}"`,
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
    link.setAttribute('download', `beamtime_matches_${paperInfo?.doi.replace(/[^a-zA-Z0-9]/g, '_') || 'doi'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    const data = {
      doi: paperInfo?.doi,
      title: paperInfo?.title,
      matches,
      scannedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `beamtime_matches_${paperInfo?.doi.replace(/[^a-zA-Z0-9]/g, '_') || 'doi'}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMatches = matches.filter((m) => {
    if (activeFilter === 'exact') return m.isExactUserPhrase || m.category === 'exact_supported';
    if (activeFilter === 'allocation') return m.category === 'allocation_phrase';
    if (activeFilter === 'general') return m.category === 'general_reference' || m.category === 'facility_citation';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Search DOI URL or Document Identifier
        </label>
        
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={doiInput}
              onChange={(e) => setDoiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchDoi()}
              placeholder="e.g. 10.1038/s41467-022-31842-x or https://doi.org/10.5286/edata/isis/r/rb1810012"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
            />
          </div>

          <button
            onClick={() => handleSearchDoi()}
            disabled={loading}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-xs transition-all shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning DOI...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Inspect DOI
              </>
            )}
          </button>
        </div>

        {/* Options & Sample Presets */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center cursor-pointer select-none text-slate-600">
              <input
                type="checkbox"
                checked={strictDigits}
                onChange={(e) => setStrictDigits(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mr-2"
              />
              Strict 7-digit proposal format (<code className="font-mono text-slate-700">RB#######</code>)
            </label>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
            <span className="font-medium flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Try sample DOIs:
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset(SAMPLE_PRESETS[0])}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-mono transition-colors border border-slate-200"
            >
              10.1038/... (Nature Comm)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(SAMPLE_PRESETS[2])}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-mono transition-colors border border-slate-200"
            >
              10.5286/... (ISIS Open Data)
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-xl border border-indigo-100 p-8 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">{loadingStage}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Checking CrossRef metadata, OpenAlex open access records, and publisher acknowledgement sections for RB beamtime allocations.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Inspection Notice</h4>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Paper Metadata Card */}
      {paperInfo && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center space-x-2 text-xs text-indigo-700 font-semibold uppercase tracking-wider mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Resolved Publication</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {paperInfo.title}
              </h2>
            </div>

            {/* Links */}
            <div className="flex items-center space-x-2 shrink-0">
              <a
                href={paperInfo.doiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                View via DOI
              </a>
              {paperInfo.openAccessPdfUrl && (
                <a
                  href={paperInfo.openAccessPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Open Access PDF
                </a>
              )}
            </div>
          </div>

          {/* Details list */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 mt-2">
            {paperInfo.authors.length > 0 && (
              <div>
                <span className="text-slate-400">Authors: </span>
                <span className="font-medium text-slate-800">
                  {paperInfo.authors.slice(0, 4).join(', ')}
                  {paperInfo.authors.length > 4 ? ` et al. (+${paperInfo.authors.length - 4})` : ''}
                </span>
              </div>
            )}
            {paperInfo.journal && (
              <div>
                <span className="text-slate-400">Journal: </span>
                <span className="font-medium text-slate-800">{paperInfo.journal}</span>
              </div>
            )}
            {paperInfo.year && (
              <div>
                <span className="text-slate-400">Year: </span>
                <span className="font-medium text-slate-800">{paperInfo.year}</span>
              </div>
            )}
            {paperInfo.fullTextSource && (
              <div>
                <span className="text-slate-400">Text Source: </span>
                <span className="font-medium text-indigo-700">{paperInfo.fullTextSource}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Metrics Bar */}
      {paperInfo && !loading && (
        <SummaryBar
          matches={matches}
          sourceTitle={paperInfo.title}
          sourceType="DOI Full-Text & Metadata"
          onExportCsv={handleExportCsv}
          onExportJson={handleExportJson}
        />
      )}

      {/* Matches List */}
      {paperInfo && !loading && matches.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center">
              Discovered References &amp; Acknowledgements ({filteredMatches.length})
            </h3>

            {/* Filter buttons */}
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
      )}

      {/* No matches state */}
      {paperInfo && !loading && matches.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-base font-semibold text-slate-800">
            No RB Proposal References Detected
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            No proposal citations matching the pattern <code className="font-mono text-slate-700">RB#######</code> or acknowledgement phrase <code className="font-mono text-emerald-700">"supported by beamtime allocation RB#######"</code> were identified in the metadata or open-access text layer of this paper.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Tip: If this paper is behind a subscription paywall, try downloading the full PDF and uploading it in the <strong>PDF Document Scanner</strong> tab.
          </p>
        </div>
      )}
    </div>
  );
};
