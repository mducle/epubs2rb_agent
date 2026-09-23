import React, { useState } from 'react';
import { RBScanMatch } from '../utils/rbScanner';
import { ExternalLink, Copy, Check, Award, CheckCircle2, Bookmark, FileText } from 'lucide-react';

interface ResultCardProps {
  match: RBScanMatch;
  index: number;
}

export const ResultCard: React.FC<ResultCardProps> = ({ match, index }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(match.rbNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExact = match.category === 'exact_supported';
  const isAllocation = match.category === 'allocation_phrase';

  // Direct STFC ISIS data track link for the RB proposal
  const dataTrackUrl = `https://doi.org/10.5286/edata/isis/r/${match.rbNumber.toLowerCase()}`;

  return (
    <div
      className={`rounded-xl border transition-all duration-150 p-4 sm:p-5 ${
        isExact
          ? 'bg-gradient-to-r from-emerald-50/60 via-white to-white border-emerald-300 shadow-xs ring-1 ring-emerald-500/20'
          : isAllocation
          ? 'bg-gradient-to-r from-indigo-50/40 via-white to-white border-indigo-200 shadow-xs'
          : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
      }`}
    >
      {/* Top row: Badges, RB Number, Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 font-semibold">
            #{index + 1}
          </span>

          {/* RB Proposal Identifier Badge */}
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md font-mono text-sm font-bold bg-slate-900 text-white shadow-xs">
            <span>{match.rbNumber}</span>
          </div>

          {/* Category Badges */}
          {isExact ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
              <Award className="w-3.5 h-3.5 mr-1 text-emerald-700 shrink-0" />
              Exact Beamtime Allocation Phrase
            </span>
          ) : isAllocation ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
              <CheckCircle2 className="w-3 h-3 mr-1 text-indigo-600" />
              Beamtime Allocation Mention
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <Bookmark className="w-3 h-3 mr-1 text-slate-500" />
              {match.categoryLabel}
            </span>
          )}

          {/* Page or Section info */}
          {match.pageNumber !== undefined && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
              <FileText className="w-3 h-3 mr-1 text-slate-500" />
              Page {match.pageNumber}
            </span>
          )}

          <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            {match.sectionHint}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-1.5 text-xs">
          <button
            onClick={handleCopy}
            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300/70 transition-colors"
            title="Copy RB Number"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 mr-1 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </>
            )}
          </button>

          <a
            href={dataTrackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
            title="View STFC ISIS Data Track repository for this proposal"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            STFC eData
          </a>
        </div>
      </div>

      {/* Snippet display with highlighted RB & allocation phrase */}
      <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/80 text-xs text-slate-700 font-sans leading-relaxed">
        <span className="text-slate-500">{match.snippet.before}</span>
        <span
          className={`font-semibold px-1.5 py-0.5 mx-0.5 rounded ${
            isExact
              ? 'bg-emerald-200/90 text-emerald-950 ring-1 ring-emerald-400'
              : 'bg-amber-200/90 text-amber-950 ring-1 ring-amber-400'
          }`}
        >
          {match.snippet.target}
        </span>
        <span className="text-slate-500">{match.snippet.after}</span>
      </div>

      {/* Full sentence context */}
      {match.snippet.fullSentence && match.snippet.fullSentence !== match.snippet.target && (
        <div className="mt-2.5 text-xs text-slate-600">
          <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider block mb-0.5">
            Full Sentence Context
          </span>
          <p className="italic text-slate-700 pl-3 border-l-2 border-indigo-300">
            "{match.snippet.fullSentence}"
          </p>
        </div>
      )}

      {/* Facility attribution footer */}
      {match.facility && match.facility !== 'Not Specified' && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Attributed Facility:{' '}
            <strong className="text-slate-700 font-medium">{match.facility}</strong>
          </span>
        </div>
      )}
    </div>
  );
};
