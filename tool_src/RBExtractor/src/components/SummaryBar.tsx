import React, { useState } from 'react';
import { RBScanMatch, computeScanSummary } from '../utils/rbScanner';
import { Download, Copy, Check, CheckCircle2, Award, Hash, Building2, Sparkles } from 'lucide-react';

interface SummaryBarProps {
  matches: RBScanMatch[];
  sourceTitle?: string;
  sourceType?: string;
  onExportCsv: () => void;
  onExportJson: () => void;
}

export const SummaryBar: React.FC<SummaryBarProps> = ({
  matches,
  sourceTitle,
  sourceType,
  onExportCsv,
  onExportJson,
}) => {
  const [copied, setCopied] = useState(false);
  const summary = computeScanSummary(matches);

  const handleCopyRBs = () => {
    if (summary.uniqueRBs.length === 0) return;
    navigator.clipboard.writeText(summary.uniqueRBs.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Scan Completed
            </span>
            <span className="text-xs text-slate-500">
              Source: <strong className="text-slate-700 font-medium">{sourceTitle || 'Current Document'}</strong> ({sourceType})
            </span>
          </div>
        </div>

        {/* Export & Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyRBs}
            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300/80 transition-colors"
            title="Copy unique RB numbers to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Copied ({summary.uniqueRBCount})
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Copy RBs ({summary.uniqueRBCount})
              </>
            )}
          </button>

          <button
            onClick={onExportCsv}
            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            Export CSV
          </button>

          <button
            onClick={onExportJson}
            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-300 transition-colors"
          >
            JSON
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Matches */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Citations</span>
            <Hash className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900">{summary.totalMatches}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Occurrences found in text</div>
        </div>

        {/* Unique RB Proposals */}
        <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-100">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-medium mb-1">
            <span>Unique RB Proposals</span>
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-indigo-900">{summary.uniqueRBCount}</div>
          <div className="text-[11px] text-indigo-700/80 font-mono truncate mt-0.5">
            {summary.uniqueRBs.join(', ') || 'None'}
          </div>
        </div>

        {/* Exact Beamtime Allocation Phrases */}
        <div className={`p-3 rounded-lg border ${summary.exactAllocationCount > 0 ? 'bg-emerald-50/80 border-emerald-200' : 'bg-slate-50 border-slate-200/70'}`}>
          <div className="flex items-center justify-between text-xs font-medium mb-1">
            <span className={summary.exactAllocationCount > 0 ? 'text-emerald-800 font-semibold' : 'text-slate-500'}>
              Exact Phrase Matches
            </span>
            <Award className={`w-3.5 h-3.5 ${summary.exactAllocationCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-xl font-bold ${summary.exactAllocationCount > 0 ? 'text-emerald-900' : 'text-slate-700'}`}>
            {summary.exactAllocationCount}
          </div>
          <div className="text-[11px] text-emerald-700/90 truncate mt-0.5">
            "supported by beamtime allocation..."
          </div>
        </div>

        {/* General / Facility Mentions */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Allocation / Facility Mentions</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {summary.allocationPhraseCount + summary.facilityCitationCount}
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            {summary.allocationPhraseCount} allocation + {summary.facilityCitationCount} facility
          </div>
        </div>
      </div>
    </div>
  );
};
