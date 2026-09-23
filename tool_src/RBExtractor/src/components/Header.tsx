import React, { useState } from 'react';
import { Atom, HelpCircle, FileCheck, ExternalLink, ShieldCheck } from 'lucide-react';
import { GuideModal } from './GuideModal';

interface HeaderProps {
  onSelectSamplePreset: (presetId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSelectSamplePreset }) => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center text-white shadow-sm ring-1 ring-black/5">
            <Atom className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Beamtime Citation &amp; RB Allocation Inspector
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                STFC / ISIS / Diamond
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-xl truncate">
              Detect facility proposals (<code className="font-mono text-slate-700 font-medium">RB#######</code>) &amp; acknowledgements (<code className="font-mono text-emerald-700">"supported by beamtime allocation RB#######"</code>)
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowGuide(true)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300/80 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Syntax &amp; Format Guide
          </button>

          <a
            href="https://www.isis.stfc.ac.uk/Pages/Applying-for-beamtime.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            STFC Beamtime Portal
          </a>
        </div>
      </div>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </header>
  );
};
