'use client';

import React, { useState } from 'react';
import { District, DistributionMode, Participant, Prize, TemporaryDrawResult } from '../lib/types';
import { Trophy, CheckCircle, RotateCcw, AlertTriangle, ShieldAlert, Target, Globe, X, Sparkles } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[var(--surface-elevated)] border-2 border-[var(--border-accent)] max-w-lg w-full overflow-hidden shadow-2xl rounded-2xl relative text-[var(--ink)]">
        {/* Modal Header */}
        <div className="bg-[var(--header-bg)] px-6 py-4 flex items-center justify-between border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--badge-bg)] text-[var(--accent)] border border-[var(--border-accent)]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-black uppercase tracking-tight text-[var(--ink)] leading-none">
                READY TO COMMENCE DRAW?
              </h3>
              <span className="font-mono text-[10px] text-[var(--accent)] font-bold uppercase tracking-widest mt-1 block">
                Malungon Teachers&apos; Day 2026
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors p-1.5 rounded-md hover:bg-white/10"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 font-mono">
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider">Prize:</span>
              <span className="font-display font-black text-base uppercase text-[var(--ink)]">{prize.name}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider">Distribution Criteria:</span>
              <span className="text-xs uppercase px-2.5 py-1 rounded-md bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--border-accent)] flex items-center gap-1.5 font-bold">
                {distributionMode === 'EQUAL_PER_DISTRICT' ? (
                  <>
                    <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Equal per District ({winnersPerDistrict} each)</span>
                  </>
                ) : targetDistrict && targetDistrict !== 'ALL' ? (
                  <>
                    <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>{targetDistrict} District Exclusive</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Combined Pool (All Districts)</span>
                  </>
                )}
              </span>
            </div>

            {prize.unitValue > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider">Unit Value:</span>
                <span className="font-display font-black text-[var(--accent)] text-lg">₱{prize.unitValue.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm border-t border-[var(--border)] pt-2.5">
              <span className="text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider">Winners to Draw:</span>
              <span className="font-display font-black text-xl text-[var(--accent)]">
                {totalWinnersToDraw} WINNER{totalWinnersToDraw > 1 ? 'S' : ''}
              </span>
            </div>

            {distributionMode === 'EQUAL_PER_DISTRICT' ? (
              <div className="border-t border-[var(--border)] pt-2.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider">District Quotas:</span>
                  <span className="text-[var(--ink)] font-bold text-[11px]">5 districts × {winnersPerDistrict} winners</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
                  {DISTRICTS.map((d) => (
                    <div key={d} className="bg-[var(--surface)] p-2 rounded-md border border-[var(--border)]">
                      <div className="text-[var(--ink-muted)] font-bold">{d.slice(0, 3)}</div>
                      <div className="text-[var(--accent)] font-black text-xs">{winnersPerDistrict}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center text-sm border-t border-[var(--border)] pt-2.5">
                <span className="text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider">Pool Structure:</span>
                <span className="font-bold text-[var(--ink)] text-xs uppercase">Combined Municipal Pool</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm border-t border-[var(--border)] pt-2.5">
              <span className="text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider">Eligible Pool:</span>
              <span className="font-bold text-[var(--ink)] text-xs uppercase">{eligiblePoolCount.toLocaleString()} Qualified</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider">Previous Winners Excluded:</span>
              <span className="text-[var(--ink-muted)] text-xs">{excludedWinnersCount.toLocaleString()}</span>
            </div>
          </div>

          <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed uppercase tracking-wider">
            {distributionMode === 'EQUAL_PER_DISTRICT'
              ? `All 5 district cards will cycle simultaneously. Exactly ${winnersPerDistrict} winner(s) will be fairly drawn per district.`
              : `All 5 district cards will cycle simultaneously. ${totalWinnersToDraw} winners will be fairly drawn from the combined pool.`}
          </p>
        </div>

        {/* Modal Footer */}
        <div className="bg-[var(--surface)] px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-elevated)] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-colors"
          >
            CANCEL
          </button>
          <button
            id="btn-confirm-start-draw"
            onClick={onConfirmStart}
            className="btn-draw px-6 py-2.5 rounded-lg text-xs font-mono font-black uppercase tracking-widest shadow-lg flex items-center gap-2"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[var(--surface-elevated)] border-2 border-emerald-500 max-w-2xl w-full overflow-hidden shadow-2xl rounded-2xl relative text-[var(--ink)]">
        {/* Header */}
        <div className="bg-[var(--header-bg)] px-6 py-4 flex items-center justify-between border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-black uppercase tracking-tight text-[var(--ink)] leading-none">
                DRAW RESULTS REVIEW • ROUND {drawResult.drawNumber}
              </h3>
              <p className="font-mono text-[10px] text-[var(--ink-muted)] uppercase tracking-widest mt-1">
                {drawResult.prize.name} • {drawResult.winners.length} WINNER{drawResult.winners.length > 1 ? 'S' : ''}
                {isEpd && ` (${drawResult.winnersPerDistrict || Math.round(drawResult.winners.length / 5)} EACH PER DISTRICT)`}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 font-mono">
          {/* District breakdown pill summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[var(--surface-card)] rounded-xl border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Criteria Summary:
            </span>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {DISTRICTS.map((d) => (
                <span
                  key={d}
                  className="px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] uppercase font-bold"
                >
                  {d === 'PRIVATE' ? 'PRIVATE' : d}: <strong className="text-[var(--accent)]">{districtCounts[d] || 0}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {drawResult.winners.map((w, idx) => (
              <div
                key={w.id}
                className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-[var(--border-accent)] transition-colors shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-[var(--surface-elevated)] text-[var(--accent)] border border-[var(--border)] font-mono font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-winner font-black text-base sm:text-lg text-[var(--ink)] uppercase tracking-tight">
                      {w.fullName}
                    </div>
                    <div className="text-xs text-[var(--ink-muted)]">
                      {w.school} • {w.position}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--border-accent)] font-bold text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {w.district === 'PRIVATE' ? 'PRIVATE' : `${w.district} DIST`}
                  </span>
                  <span className="bg-[var(--surface)] text-[var(--ink-muted)] border border-[var(--border)] font-bold text-xs px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {w.personnelType}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Safety Notice */}
          <div className="bg-[var(--surface-card)] border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[var(--ink-muted)]">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong className="text-amber-400 uppercase font-bold">Event-Day Safety Safeguard:</strong> These winners are temporary. They will <strong>NOT</strong> be recorded permanently or deducted from inventory until you click <strong>CONFIRM WINNERS</strong>.
            </p>
          </div>

          {showRedrawConfirm && (
            <div className="bg-red-950/30 border-2 border-red-500/60 rounded-xl p-4 animate-fade-in space-y-2">
              <div className="flex items-center gap-2 text-red-300 font-bold text-sm uppercase tracking-wider">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>Confirm Redraw Action</span>
              </div>
              <p className="text-xs text-red-200/80 leading-relaxed">
                Are you sure you want to discard these temporary results? This round will be recorded as REDRAWN in audit logs.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowRedrawConfirm(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-white/20 text-xs text-[var(--ink)] hover:bg-white/10 font-bold uppercase tracking-wider"
                >
                  Keep Results
                </button>
                <button
                  onClick={() => {
                    setShowRedrawConfirm(false);
                    onRedraw();
                  }}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white uppercase tracking-wider shadow"
                >
                  Yes, Discard and Redraw
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[var(--surface)] px-6 py-4 border-t border-[var(--border)] flex justify-between items-center">
          <button
            id="btn-action-redraw"
            onClick={() => setShowRedrawConfirm(true)}
            className="px-4 py-2 rounded-lg border border-red-500/40 hover:bg-red-950/30 text-red-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REDRAW ROUND</span>
          </button>

          <button
            id="btn-action-confirm-winners"
            onClick={onConfirmWinners}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg active:scale-95 animate-pulse"
          >
            <CheckCircle className="w-4 h-4" />
            <span>CONFIRM WINNERS</span>
          </button>
        </div>
      </div>
    </div>
  );
};

