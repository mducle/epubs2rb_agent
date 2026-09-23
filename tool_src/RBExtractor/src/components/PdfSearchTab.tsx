import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import { extractTextFromPdf, ExtractedPdfResult } from '../utils/pdfParser';
import { scanTextForRB, RBScanMatch } from '../utils/rbScanner';
import { ResultCard } from './ResultCard';
import { SummaryBar } from './SummaryBar';
import { generateSampleBeamtimePdf } from '../utils/samplePdfGenerator';

export const PdfSearchTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [progressInfo, setProgressInfo] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const [pdfData, setPdfData] = useState<ExtractedPdfResult | null>(null);
  const [matches, setMatches] = useState<RBScanMatch[]>([]);
  const [strictDigits, setStrictDigits] = useState(false);
  const [selectedPageFilter, setSelectedPageFilter] = useState<number | 'all'>('all');
  const [activePhraseFilter, setActivePhraseFilter] = useState<'all' | 'exact' | 'allocation'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processPdfBlob = async (blobOrFile: File | Blob, customName?: string) => {
    setError(null);
    setLoading(true);
    setProgressInfo({ current: 0, total: 0 });
    setMatches([]);
    setPdfData(null);

    try {
      const parsed = await extractTextFromPdf(blobOrFile, (current, total) => {
        setProgressInfo({ current, total });
      });

      if (customName) {
        parsed.fileName = customName;
      }

      setPdfData(parsed);

      // Scan each page
      const accumulatedMatches: RBScanMatch[] = [];

      for (const page of parsed.pages) {
        const pageMatches = scanTextForRB(page.text, {
          pageNumber: page.pageNumber,
          strictSevenDigits: strictDigits,
          sourceName: parsed.fileName,
        });
        accumulatedMatches.push(...pageMatches);
      }

      setMatches(accumulatedMatches);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error parsing PDF document');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPdfBlob(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      processPdfBlob(file);
    } else if (file) {
      setError('Please provide a valid .pdf document');
    }
  };

  const handleLoadSamplePdf = () => {
    const blob = generateSampleBeamtimePdf();
    processPdfBlob(blob, 'STFC_ISIS_Sample_Paper.pdf');
  };

  // Export handlers
  const handleExportCsv = () => {
    if (matches.length === 0) return;
    const headers = ['PDF Name', 'Page', 'RB Proposal', 'Category', 'Exact Phrase', 'Section', 'Sentence Context'];
    const rows = matches.map((m) => [
      `"${pdfData?.fileName || 'document.pdf'}"`,
      m.pageNumber || '',
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
    link.setAttribute('download', `beamtime_matches_${pdfData?.fileName.replace(/[^a-zA-Z0-9]/g, '_') || 'doc'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    const data = {
      fileName: pdfData?.fileName,
      totalPages: pdfData?.totalPages,
      matches,
      scannedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `beamtime_matches_${pdfData?.fileName.replace(/[^a-zA-Z0-9]/g, '_') || 'doc'}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered matches
  const filteredMatches = matches.filter((m) => {
    if (selectedPageFilter !== 'all' && m.pageNumber !== selectedPageFilter) return false;
    if (activePhraseFilter === 'exact' && !m.isExactUserPhrase && m.category !== 'exact_supported') return false;
    if (activePhraseFilter === 'allocation' && m.category !== 'allocation_phrase') return false;
    return true;
  });

  const pagesWithMatches = Array.from(new Set(matches.map((m) => m.pageNumber).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Upload Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="bg-white border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-6 sm:p-8 text-center transition-all cursor-pointer group shadow-xs"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="w-12 h-12 rounded-full bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 transition-colors">
          <Upload className="w-6 h-6" />
        </div>

        <h3 className="text-sm sm:text-base font-semibold text-slate-800">
          Upload PDF Document or Drag &amp; Drop
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Scans all text layers, footnotes, acknowledgement sections, and references for <code className="font-mono text-slate-700">RB#######</code> and allocation statements.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            Browse PDF File
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLoadSamplePdf();
            }}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            Load Sample Beamtime PDF
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs px-1 text-slate-600">
        <label className="inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={strictDigits}
            onChange={(e) => {
              setStrictDigits(e.target.checked);
              // re-scan if pdf loaded
              if (pdfData) {
                const acc: RBScanMatch[] = [];
                for (const page of pdfData.pages) {
                  acc.push(
                    ...scanTextForRB(page.text, {
                      pageNumber: page.pageNumber,
                      strictSevenDigits: e.target.checked,
                      sourceName: pdfData.fileName,
                    })
                  );
                }
                setMatches(acc);
              }
            }}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mr-2"
          />
          Strict 7-digit proposal format (<code className="font-mono text-slate-700">RB#######</code>)
        </label>
        <span className="text-slate-400">Supported format: PDF 1.2 through 2.0 with embedded text</span>
      </div>

      {/* Loading & Extraction Progress */}
      {loading && (
        <div className="bg-white rounded-xl border border-indigo-100 p-8 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">
            Extracting PDF Text Layer...
          </p>
          {progressInfo.total > 0 && (
            <p className="text-xs font-mono text-indigo-600 mt-1">
              Processing Page {progressInfo.current} of {progressInfo.total}
            </p>
          )}
          <div className="w-48 bg-slate-100 rounded-full h-1.5 mx-auto mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-150"
              style={{
                width: `${
                  progressInfo.total > 0
                    ? (progressInfo.current / progressInfo.total) * 100
                    : 15
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">PDF Processing Error</h4>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* PDF Document Summary */}
      {pdfData && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {pdfData.fileName}
                </h3>
                <p className="text-xs text-slate-500">
                  {pdfData.totalPages} pages parsed • {(pdfData.fileSizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {matches.length} Citations Found
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics Bar */}
      {pdfData && !loading && (
        <SummaryBar
          matches={matches}
          sourceTitle={pdfData.fileName}
          sourceType={`${pdfData.totalPages} Pages PDF`}
          onExportCsv={handleExportCsv}
          onExportJson={handleExportJson}
        />
      )}

      {/* Matches with Page Filters */}
      {pdfData && !loading && matches.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <h3 className="font-semibold text-slate-900 text-sm">
              Discovered Proposal References ({filteredMatches.length})
            </h3>

            {/* Page selector pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 mr-1 flex items-center">
                <Filter className="w-3.5 h-3.5 mr-1" />
                Filter by Page:
              </span>
              <button
                onClick={() => setSelectedPageFilter('all')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  selectedPageFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Pages
              </button>
              {pagesWithMatches.map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setSelectedPageFilter(pageNum as number)}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    selectedPageFilter === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-indigo-50'
                  }`}
                >
                  Page {pageNum}
                </button>
              ))}
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
      {pdfData && !loading && matches.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-base font-semibold text-slate-800">
            No Beamtime References Found in this PDF
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            All {pdfData.totalPages} pages were scanned, but no references of the form{' '}
            <code className="font-mono text-slate-700">RB#######</code> or acknowledgement phrases were found.
          </p>
          <button
            onClick={handleLoadSamplePdf}
            className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Try with Sample Beamtime Paper PDF
          </button>
        </div>
      )}
    </div>
  );
};
