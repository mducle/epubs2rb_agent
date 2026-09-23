/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { DoiSearchTab } from './components/DoiSearchTab';
import { PdfSearchTab } from './components/PdfSearchTab';
import { BatchDoiTab } from './components/BatchDoiTab';
import { RawTextTab } from './components/RawTextTab';
import { Search, FileText, Layers, AlignLeft, Info, CheckCircle2, Atom } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'doi' | 'pdf' | 'batch' | 'text'>('doi');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <Header onSelectSamplePreset={() => {}} />

      {/* Hero Banner / Facility Context */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
                <Atom className="w-3.5 h-3.5" />
                <span>Facility Research Output &amp; Beamtime Verification</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Search Publications for Proposal Identifiers &amp; Funding Statements
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Automatically scans DOIs, research papers, and PDF documents for beamtime proposal numbers of the form{' '}
                <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-1 py-0.5 rounded">
                  RB#######
                </span>{' '}
                and standardized acknowledgement phrasing:{' '}
                <span className="font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">
                  "supported by beamtime allocation RB#######"
                </span>
                .
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200/80 self-start md:self-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800 block">Target Facilities:</span>
                <span>ISIS Neutron &amp; Muon Source • Diamond Light Source • STFC Facilities</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 mt-5 border-b border-slate-200 -mb-5 overflow-x-auto pb-0">
            <button
              onClick={() => setActiveTab('doi')}
              className={`inline-flex items-center px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'doi'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Search className="w-4 h-4 mr-2" />
              DOI URL Search
            </button>

            <button
              onClick={() => setActiveTab('pdf')}
              className={`inline-flex items-center px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'pdf'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF Document Scanner
            </button>

            <button
              onClick={() => setActiveTab('batch')}
              className={`inline-flex items-center px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'batch'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Layers className="w-4 h-4 mr-2" />
              Batch DOI Audit
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`inline-flex items-center px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'text'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <AlignLeft className="w-4 h-4 mr-2" />
              Direct Text / Manuscript
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {activeTab === 'doi' && <DoiSearchTab />}
        {activeTab === 'pdf' && <PdfSearchTab />}
        {activeTab === 'batch' && <BatchDoiTab />}
        {activeTab === 'text' && <RawTextTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Atom className="w-4 h-4 text-indigo-600" />
            <span>
              Beamtime Citation &amp; RB Allocation Inspector — Designed for STFC Rutherford Appleton Laboratory, ISIS &amp; Diamond facilities.
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Standard Pattern: <code className="font-mono text-slate-700 font-bold">RB#######</code></span>
            <span>•</span>
            <span>Phrase: <code className="font-mono text-emerald-700 font-bold">supported by beamtime allocation RB#######</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
