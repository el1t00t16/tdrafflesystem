'use client';

import React, { useState } from 'react';
import { GAS_CODE_GS, GAS_SETUP_SHEETS_GS } from '../lib/gas-bundle';
import { Copy, Check, Download, FileCode, ExternalLink, HelpCircle } from 'lucide-react';

export const GasGuideView: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<'code' | 'setup' | 'sheets' | 'guide'>('code');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-[#121212] border border-white/10 p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative border-t-2 border-t-[#FF1E1E]">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black text-[#FF1E1E] uppercase tracking-widest mb-1.5">
            <FileCode className="w-4 h-4" />
            <span>Deployment Ready Deliverable</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-none">
            Google Apps Script + Google Sheets Source Code
          </h2>
          <p className="text-xs text-neutral-400 mt-2 max-w-2xl font-medium">
            This entire raffle system is designed to run natively inside Google Apps Script connected to Google Sheets. Copy the files below or follow the one-click setup guide.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://sheets.new"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-[#FF1E1E] hover:bg-[#ff3838] text-white font-black text-xs uppercase tracking-wider shadow transition-all flex items-center gap-2 rounded-none"
          >
            <span>Open Google Sheets</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Code Tabs */}
      <div className="bg-[#121212] border border-white/10 overflow-hidden shadow-2xl">
        {/* Tab Headers */}
        <div className="bg-black px-4 py-3 border-b border-white/15 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveCodeTab('code')}
              className={`px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors rounded-none ${
                activeCodeTab === 'code'
                  ? 'bg-[#FF1E1E] text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Code.gs (Backend Engine)
            </button>

            <button
              onClick={() => setActiveCodeTab('setup')}
              className={`px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors rounded-none ${
                activeCodeTab === 'setup'
                  ? 'bg-[#FF1E1E] text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              SetupSheets.gs (1-Click Auto Setup)
            </button>

            <button
              onClick={() => setActiveCodeTab('sheets')}
              className={`px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors rounded-none ${
                activeCodeTab === 'sheets'
                  ? 'bg-[#FF1E1E] text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Sheet Schema &amp; Headers
            </button>

            <button
              onClick={() => setActiveCodeTab('guide')}
              className={`px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors rounded-none ${
                activeCodeTab === 'guide'
                  ? 'bg-[#FF1E1E] text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Deployment &amp; Live Guide
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {activeCodeTab === 'code' && (
              <>
                <button
                  onClick={() => handleCopy(GAS_CODE_GS, 'code')}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/20 rounded-none"
                >
                  {copiedKey === 'code' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#FF1E1E]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code.gs</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload('Code.gs', GAS_CODE_GS)}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/20 rounded-none"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .gs</span>
                </button>
              </>
            )}

            {activeCodeTab === 'setup' && (
              <>
                <button
                  onClick={() => handleCopy(GAS_SETUP_SHEETS_GS, 'setup')}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/20 rounded-none"
                >
                  {copiedKey === 'setup' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#FF1E1E]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SetupSheets.gs</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload('SetupSheets.gs', GAS_SETUP_SHEETS_GS)}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/20 rounded-none"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .gs</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 text-xs font-mono max-h-[550px] overflow-y-auto">
          {activeCodeTab === 'code' && (
            <pre className="text-neutral-300 leading-relaxed whitespace-pre font-mono">
              {GAS_CODE_GS}
            </pre>
          )}

          {activeCodeTab === 'setup' && (
            <pre className="text-neutral-300 leading-relaxed whitespace-pre font-mono">
              {GAS_SETUP_SHEETS_GS}
            </pre>
          )}

          {activeCodeTab === 'sheets' && (
            <div className="space-y-6 font-sans text-xs text-neutral-300">
              <div className="bg-neutral-950 p-4 border border-white/10">
                <h4 className="font-black text-xs uppercase tracking-widest text-[#FF1E1E] mb-3">
                  1. PARTICIPANTS Sheet Columns (15 Columns)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-neutral-400">
                  <div>A: Participant ID (TD26-00001)</div>
                  <div>B: Last Name (Santos)</div>
                  <div>C: First Name (Maria)</div>
                  <div>D: Middle Name (G.)</div>
                  <div>E: Full Name (Santos, Maria G.)</div>
                  <div>F: District (NORTH, SOUTH, EAST, WEST, PRIVATE)</div>
                  <div>G: Personnel Type (TEACHING, NON-TEACHING)</div>
                  <div>H: School (Malungon NHS)</div>
                  <div>I: Position (Teacher III)</div>
                  <div>J: Contact Number (09171234567)</div>
                  <div>K: Eligible (ELIGIBLE or INELIGIBLE)</div>
                  <div>L: Winner (YES or NO)</div>
                  <div>M: Claimed (YES or NO)</div>
                  <div>N: Status (ACTIVE)</div>
                  <div>O: Created At (2026-09-01 08:00:00)</div>
                </div>
              </div>

              <div className="bg-neutral-950 p-4 border border-white/10">
                <h4 className="font-black text-xs uppercase tracking-widest text-[#FF1E1E] mb-3">
                  2. PRIZES Sheet Columns (9 Columns)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-neutral-400">
                  <div>A: Prize ID (P001)</div>
                  <div>B: Prize Name (₱500 Cash Prize)</div>
                  <div>C: Description (Teachers Day Envelope)</div>
                  <div>D: Unit Value (500)</div>
                  <div>E: Quantity (10)</div>
                  <div>F: Drawn Quantity (0)</div>
                  <div>G: Remaining Quantity (10)</div>
                  <div>H: Total Value (5000)</div>
                  <div>I: Status (AVAILABLE)</div>
                </div>
              </div>

              <div className="bg-neutral-950 p-4 border border-white/10">
                <h4 className="font-black text-xs uppercase tracking-widest text-[#FF1E1E] mb-3">
                  3. WINNERS Sheet Columns (13 Columns)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-neutral-400">
                  <div>A: Winner ID (WN-0001)</div>
                  <div>B: Participant ID (TD26-00042)</div>
                  <div>C: Name (Santos, Maria G.)</div>
                  <div>D: District (NORTH)</div>
                  <div>E: Personnel Type (TEACHING)</div>
                  <div>F: School (Malungon NHS)</div>
                  <div>G: Prize (₱500 Cash Prize)</div>
                  <div>H: Draw Number (DRAW-0001)</div>
                  <div>I: Date (2026-10-05)</div>
                  <div>J: Time (10:15:30)</div>
                  <div>K: Claim Status (UNCLAIMED / CLAIMED)</div>
                  <div>L: Claimed At (Timestamp)</div>
                  <div>M: Claimed By (Officer Name)</div>
                </div>
              </div>

              <div className="bg-neutral-950 p-4 border border-white/10">
                <h4 className="font-black text-xs uppercase tracking-widest text-[#FF1E1E] mb-3">
                  4. RAFFLE_LOG Sheet Columns (10 Columns)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] text-neutral-400">
                  <div>A: Log ID (LOG-0001)</div>
                  <div>B: Draw Number (DRAW-0001)</div>
                  <div>C: Timestamp (2026-10-05 10:15:30)</div>
                  <div>D: Prize ID (P001)</div>
                  <div>E: Prize Name (₱500 Cash Prize)</div>
                  <div>F: Number of Winners (3)</div>
                  <div>G: Eligible Pool Size (1950)</div>
                  <div>H: Winner IDs (TD26-00012, TD26-00892...)</div>
                  <div>I: Status (CONFIRMED / REDRAWN)</div>
                  <div>J: Admin (email or name)</div>
                </div>
              </div>
            </div>
          )}

          {activeCodeTab === 'guide' && (
            <div className="space-y-4 font-sans text-xs text-neutral-300 leading-relaxed">
              <div className="bg-neutral-950 p-4 border border-white/10">
                <h4 className="font-black text-xs uppercase tracking-widest text-[#FF1E1E] mb-2">
                  Step 1: Create Spreadsheet &amp; Run Initial Setup
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-neutral-400">
                  <li>Open <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-white underline font-bold">sheets.new</a> in Google Chrome.</li>
                  <li>Click <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Paste <code>Code.gs</code> and <code>SetupSheets.gs</code>.</li>
                  <li>Select <code>runInitialSetup</code> from the top function dropdown and click <strong>Run</strong>.</li>
                  <li>All 5 sheets, styling, headers, formulas, and sample prizes will be generated automatically!</li>
                </ol>
              </div>

              <div className="bg-neutral-950 p-4 border border-white/10">
                <h4 className="font-black text-xs uppercase tracking-widest text-[#FF1E1E] mb-2">
                  Step 2: Deploy as Google Apps Script Web App
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-neutral-400">
                  <li>Click the <strong>Deploy</strong> button &gt; <strong>New deployment</strong>.</li>
                  <li>Select type: <strong>Web app</strong> (gear icon).</li>
                  <li>Description: <code>Malungon Teachers Day 2026 Live Raffle</code>.</li>
                  <li>Execute as: <strong>Me</strong> (your Google account).</li>
                  <li>Who has access: <strong>Anyone</strong>.</li>
                  <li>Click <strong>Deploy</strong> and copy the generated Web App URL.</li>
                </ol>
              </div>

              <div className="bg-neutral-950 p-4 border border-white/10">
                <h4 className="font-black text-xs uppercase tracking-widest text-[#FF1E1E] mb-2">
                  Step 3: Opening Public Projector Display vs Admin
                </h4>
                <ul className="space-y-1 text-neutral-400">
                  <li>
                    <strong>Public Projector / LED Screen:</strong> Add <code>?page=raffle</code> to the Web App URL and press <strong>F11 (Fullscreen)</strong>.
                  </li>
                  <li>
                    <strong>Admin Control Dashboard:</strong> Add <code>?page=admin</code> (or open without parameters) on the laptop operator screen.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
