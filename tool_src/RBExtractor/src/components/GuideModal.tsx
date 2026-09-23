import React from 'react';
import { X, CheckCircle2, AlertCircle, FileText, ExternalLink, BookmarkCheck } from 'lucide-react';

interface GuideModalProps {
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <BookmarkCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900 text-base">
              Beamtime Allocation &amp; RB Citation Guide
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-sm text-slate-600 max-h-[80vh] overflow-y-auto">
          <div>
            <h4 className="font-semibold text-slate-900 mb-1 flex items-center">
              What is an RB Proposal Number?
            </h4>
            <p className="text-slate-600 leading-relaxed">
              In UK and international large-scale research facilities—specifically the{' '}
              <strong>ISIS Neutron and Muon Source</strong> and <strong>Diamond Light Source</strong> (located at the STFC Rutherford Appleton Laboratory, Harwell Campus)—beamtime proposals and experimental runs are assigned an <strong>RB number</strong> (Round Beamtime / Rutherford Beamtime).
            </p>
            <div className="mt-2.5 p-3 bg-slate-100 rounded-lg font-mono text-xs text-slate-800 border border-slate-200 flex items-center justify-between">
              <span>Standard Format: <strong className="text-indigo-700">RB#######</strong> (e.g. RB1910243, RB2000012)</span>
              <span className="text-slate-500">7 Digits Standard</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center">
              Target Acknowledgement &amp; Reference Patterns
            </h4>
            <ul className="space-y-2">
              <li className="p-2.5 rounded-md bg-emerald-50/80 border border-emerald-200/80">
                <div className="flex items-center text-emerald-900 font-semibold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 shrink-0" />
                  Exact Target Phrase (Highest Match Confidence)
                </div>
                <div className="font-mono text-xs text-emerald-800 pl-5.5">
                  "supported by beamtime allocation RB#######"
                </div>
                <div className="text-xs text-emerald-700 pl-5.5 mt-0.5">
                  e.g., <em>"This work was supported by beamtime allocation RB1910243 from STFC."</em>
                </div>
              </li>

              <li className="p-2.5 rounded-md bg-indigo-50/80 border border-indigo-200/80">
                <div className="flex items-center text-indigo-900 font-semibold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-indigo-600 shrink-0" />
                  General Allocation &amp; Facility Mentions
                </div>
                <div className="font-mono text-xs text-indigo-800 pl-5.5">
                  "provision of beamtime under allocation RB#######" / "beamtime allocation RB#######"
                </div>
                <div className="text-xs text-indigo-700 pl-5.5 mt-0.5">
                  e.g., <em>"We thank STFC for provision of beamtime under proposal RB2010892 on MAPS."</em>
                </div>
              </li>

              <li className="p-2.5 rounded-md bg-slate-100 border border-slate-200">
                <div className="flex items-center text-slate-900 font-semibold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-slate-600 shrink-0" />
                  Data Track Citations &amp; References
                </div>
                <div className="font-mono text-xs text-slate-800 pl-5.5">
                  doi.org/10.5286/edata/isis/r/rb#######
                </div>
                <div className="text-xs text-slate-600 pl-5.5 mt-0.5">
                  Official persistent data identifiers minted by the STFC eData repository for experimental data tracks.
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">
              How DOI Resolution Works
            </h4>
            <p className="text-slate-600 text-xs leading-relaxed">
              When entering a DOI URL (e.g. <code className="text-indigo-700">https://doi.org/10.1038/...</code> or <code className="text-indigo-700">10.1016/...</code>), the server queries CrossRef metadata (including funding awards and references), retrieves Open Access full-text via Europe PMC and OpenAlex, and inspects the publisher's landing page text to find acknowledgements and citations.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
            >
              Got it, close guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
