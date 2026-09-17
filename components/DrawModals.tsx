'use client';

import React, { useState } from 'react';
import { District, DistributionMode, Participant, Prize, TemporaryDrawResult } from '../lib/types';
import { Trophy, CheckCircle, RotateCcw, AlertTriangle, ShieldAlert, Target, Globe, X } from 'lucide-react';

const DISTRICTS: District[] = ['NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'];

interface DrawPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmStart: () => void;
  prize: Prize | null;
  distributionMode: DistributionMode;
  eligiblePoolCount: number;
  excludedWinnersCount: number;
  winnersPerDistrict: number;
  totalWinnersToDraw: number;
  districtEligibleCounts: Record<District, number>;
  targetDistrict?: District | 'ALL';
}

export const DrawPreviewModal: React.FC<DrawPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirmStart,
  prize,
  distributionMode,
  eligiblePoolCount,
  excludedWinnersCount,
  winnersPerDistrict,
  totalWinnersToDraw,
  districtEligibleCounts: _districtEligibleCounts,
  targetDistrict
}) => {
  if (!isOpen || !prize) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#f8f7f4] border-2 border-[#1a1a1a] max-w-lg w-full overflow-hidden shadow-2xl relative text-[#1a1a1a]">
        {/* Modal Header */}
        <div className="bg-[#1a1a1a] px-6 py-4 flex items-center justify-between text-[#f8f7f4]">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-[#ff6a00]" />
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-white leading-none">
                READY TO DRAW?
              </h3>
              <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest mt-0.5 block">
                Malungon Teachers&apos; Day 2026
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="bg-white border border-[#1a1a1a]/15 p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="font-mono text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Prize:</span>
              <span className="font-display font-bold text-base uppercase text-[#1a1a1a]">{prize.name}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="font-mono text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Distribution Criteria:</span>
              <span className="font-mono text-xs uppercase px-2 py-0.5 bg-[#1a1a1a] text-white flex items-center gap-1.5 font-bold">
                {distributionMode === 'EQUAL_PER_DISTRICT' ? (
                  <>
                    <Target className="w-3.5 h-3.5 text-[#ff6a00]" />
                    <span>Equal per District ({winnersPerDistrict} each)</span>
                  </>
                ) : targetDistrict && targetDistrict !== 'ALL' ? (
                  <>
                    <Target className="w-3.5 h-3.5 text-[#ff6a00]" />
                    <span>{targetDistrict} District Exclusive</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-[#ff6a00]" />
                    <span>Combined Pool (All Districts)</span>
                  </>
                )}
              </span>
            </div>

            {prize.unitValue > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="font-mono text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Unit Value:</span>
                <span className="font-display font-bold text-[#ff6a00] text-lg">₱{prize.unitValue.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm border-t border-[#1a1a1a]/10 pt-2">
              <span className="font-mono text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Winners to Draw:</span>
              <span className="font-display font-bold text-lg text-[#1a1a1a]">
                {totalWinnersToDraw} WINNER{totalWinnersToDraw > 1 ? 'S' : ''}
              </span>
            </div>

            {distributionMode === 'EQUAL_PER_DISTRICT' ? (
              <div className="border-t border-[#1a1a1a]/10 pt-2 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono text-neutral-500 font-bold uppercase text-[10px] tracking-wider">District Quotas:</span>
                  <span className="font-mono text-[#1a1a1a] font-bold text-[11px]">5 districts × {winnersPerDistrict} winners each</span>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
                  {DISTRICTS.map((d) => (
                    <div key={d} className="bg-[#f8f7f4] p-1.5 border border-[#1a1a1a]/15">
                      <div className="text-neutral-500 font-bold">{d.slice(0, 3)}</div>
                      <div className="text-[#1a1a1a] font-bold">{winnersPerDistrict}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center text-sm border-t border-[#1a1a1a]/10 pt-2">
                <span className="font-mono text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Pool Structure:</span>
                <span className="font-mono font-bold text-[#1a1a1a] text-xs uppercase">Combined Municipal Pool</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm border-t border-[#1a1a1a]/10 pt-2">
              <span className="font-mono text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Eligible Pool:</span>
              <span className="font-mono font-bold text-[#1a1a1a] text-xs uppercase">{eligiblePoolCount.toLocaleString()} Teaching Personnel</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="font-mono text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Non-Teaching Status:</span>
              <span className="font-mono text-neutral-600 text-xs uppercase font-bold">Excluded from Draw</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="font-mono text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Previous Winners Excluded:</span>
              <span className="font-mono text-neutral-600 text-xs">{excludedWinnersCount.toLocaleString()}</span>
            </div>
          </div>

          <p className="font-mono text-[11px] text-[#1a1a1a]/70 leading-relaxed uppercase tracking-wider">
            {distributionMode === 'EQUAL_PER_DISTRICT'
              ? `All 5 district cards will cycle simultaneously. Exactly ${winnersPerDistrict} winner(s) will be fairly chosen per district (${totalWinnersToDraw} total).`
              : `All 5 district cards will cycle simultaneously. ${totalWinnersToDraw} winners will be fairly chosen from the entire combined pool.`}
          </p>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#f8f7f4] px-6 py-4 border-t border-[#1a1a1a]/15 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#1a1a1a] text-[#1a1a1a] hover:bg-white text-xs font-mono font-bold uppercase tracking-wider transition-colors"
          >
            CANCEL
          </button>
          <button
            id="btn-confirm-start-draw"
            onClick={onConfirmStart}
            className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#ff6a00] text-white text-xs font-mono font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
          >
            <span>START DRAW →</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface DrawReviewModalProps {
  isOpen: boolean;
  drawResult: TemporaryDrawResult | null;
  onConfirmWinners: () => void;
  onRedraw: () => void;
}

export const DrawReviewModal: React.FC<DrawReviewModalProps> = ({
  isOpen,
  drawResult,
  onConfirmWinners,
  onRedraw
}) => {
  const [showRedrawConfirm, setShowRedrawConfirm] = useState(false);

  if (!isOpen || !drawResult) return null;

  const isEpd = drawResult.distributionMode === 'EQUAL_PER_DISTRICT';

  // Count winners per district
  const districtCounts: Record<string, number> = {};
  drawResult.winners.forEach((w) => {
    districtCounts[w.district] = (districtCounts[w.district] || 0) + 1;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#f8f7f4] border-2 border-[#1a1a1a] max-w-2xl w-full overflow-hidden shadow-2xl relative text-[#1a1a1a]">
        {/* Header */}
        <div className="bg-[#1a1a1a] px-6 py-4 flex items-center justify-between text-[#f8f7f4]">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-[#ff6a00]" />
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-white leading-none">
                DRAW RESULTS REVIEW • {drawResult.drawNumber}
              </h3>
              <p className="font-mono text-[10px] text-white/60 uppercase tracking-widest mt-1">
                {drawResult.prize.name} • {drawResult.winners.length} WINNER{drawResult.winners.length > 1 ? 'S' : ''}
                {isEpd && ` (${drawResult.winnersPerDistrict || Math.round(drawResult.winners.length / 5)} EACH PER DISTRICT)`}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* District breakdown pill summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white border border-[#1a1a1a]/15">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Criteria Summary:
            </span>
            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
              {DISTRICTS.map((d) => (
                <span
                  key={d}
                  className="px-2 py-0.5 bg-[#f8f7f4] border border-[#1a1a1a]/20 text-[#1a1a1a] uppercase font-bold"
                >
                  {d === 'PRIVATE' ? 'PRIVATE (ECCD+LSB)' : d}: <strong className="text-[#ff6a00]">{districtCounts[d] || 0}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {drawResult.winners.map((w, idx) => (
              <div
                key={w.id}
                className="bg-white border border-[#1a1a1a]/15 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-[#1a1a1a]/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-[#1a1a1a] text-white font-mono font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-display font-bold text-base sm:text-lg text-[#1a1a1a] uppercase tracking-tight">
                      {w.fullName}
                    </div>
                    <div className="font-mono text-xs text-[#1a1a1a]/70">
                      {w.school} • {w.position}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="bg-[#ff6a00] text-white font-mono font-bold text-xs px-2.5 py-0.5 uppercase tracking-wider">
                    {w.district === 'PRIVATE' ? 'PRIVATE (ECCD/LSB)' : `${w.district} DISTRICT`}
                  </span>
                  <span className="bg-[#1a1a1a] text-white font-mono font-bold text-xs px-2 py-0.5 uppercase tracking-wider">
                    {w.personnelType}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Safety Notice */}
          <div className="bg-white border border-[#1a1a1a]/15 p-3 flex items-start gap-2.5 text-xs text-[#1a1a1a]/80">
            <ShieldAlert className="w-5 h-5 text-[#ff6a00] flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed font-mono text-[11px]">
              <strong className="text-[#1a1a1a] uppercase font-bold">Event-Day Safety:</strong> These winners are temporary. They will <strong>NOT</strong> be recorded permanently or removed from the raffle pool until you click <strong>CONFIRM WINNERS</strong>.
            </p>
          </div>

          {showRedrawConfirm && (
            <div className="bg-white border-2 border-[#ff6a00] p-4 animate-fade-in">
              <div className="flex items-center gap-2 text-[#1a1a1a] font-bold text-sm mb-2 uppercase tracking-wider font-mono">
                <AlertTriangle className="w-5 h-5 text-[#ff6a00]" />
                <span>Confirm Redraw Action</span>
              </div>
              <p className="font-mono text-xs text-[#1a1a1a]/80 mb-3 leading-relaxed">
                Are you sure you want to discard these temporary results? This round will be marked as REDRAWN in the audit log and won&apos;t count as official winners.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRedrawConfirm(false)}
                  className="px-3 py-1.5 border border-[#1a1a1a] text-xs text-[#1a1a1a] hover:bg-[#f8f7f4] font-mono font-bold uppercase tracking-wider"
                >
                  Keep Results
                </button>
                <button
                  onClick={() => {
                    setShowRedrawConfirm(false);
                    onRedraw();
                  }}
                  className="px-4 py-1.5 bg-[#ff6a00] hover:bg-[#ff7e1d] text-xs font-mono font-bold text-white uppercase tracking-wider shadow"
                >
                  Yes, Discard and Redraw
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#f8f7f4] px-6 py-4 border-t border-[#1a1a1a]/15 flex justify-between items-center">
          <button
            id="btn-action-redraw"
            onClick={() => setShowRedrawConfirm(true)}
            className="px-4 py-2 border border-[#1a1a1a] hover:bg-white text-[#1a1a1a] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-[#ff6a00]" />
            <span>REDRAW</span>
          </button>

          <button
            id="btn-action-confirm-winners"
            onClick={onConfirmWinners}
            className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#ff6a00] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md"
          >
            <CheckCircle className="w-4 h-4 text-white" />
            <span>CONFIRM WINNERS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
