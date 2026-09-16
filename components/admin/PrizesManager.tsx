'use client';

import React, { useState } from 'react';
import { Prize } from '../../lib/types';
import { Gift, Plus, CheckCircle, AlertCircle, X, Trash2, Cloud, CloudOff, UploadCloud } from 'lucide-react';
import { isSupabaseConfigured, syncPrizesToSupabase } from '../../lib/supabase';

interface PrizesManagerProps {
  prizes: Prize[];
  onAddPrize: (prize: Prize) => void;
  onDeletePrize?: (prizeId: string) => void;
  onClearAllPrizes?: () => void;
}

export const PrizesManager: React.FC<PrizesManagerProps> = ({
  prizes,
  onAddPrize,
  onDeletePrize,
  onClearAllPrizes
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [prizeType, setPrizeType] = useState<'ITEM' | 'CASH'>('ITEM');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitValue, setUnitValue] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [cloudMsg, setCloudMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const handleSyncToCloud = async () => {
    if (!isSupabaseConfigured()) {
      alert('Supabase credentials are not configured yet! Please enter your Supabase Project URL and Anon Key in the Settings tab first.');
      return;
    }
    setSyncingCloud(true);
    setCloudMsg({ text: 'Syncing prizes to Supabase Cloud...' });
    const res = await syncPrizesToSupabase(prizes);
    setSyncingCloud(false);
    if (res.success) {
      setCloudMsg({ text: `Successfully synced ${res.count} prizes to Supabase Cloud!` });
      setTimeout(() => setCloudMsg(null), 4000);
    } else {
      setCloudMsg({ text: `Sync error: ${res.error}`, error: true });
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || quantity <= 0) return;

    const isCash = prizeType === 'CASH';
    const finalUnitValue = isCash ? (Number(unitValue) || 0) : 0;
    const finalQuantity = Number(quantity) || 1;

    const nextId = `P${String(prizes.length + 1).padStart(3, '0')}`;
    const newPrize: Prize = {
      id: nextId,
      name: name.trim(),
      description: description.trim(),
      unitValue: finalUnitValue,
      quantity: finalQuantity,
      drawnQuantity: 0,
      remainingQuantity: finalQuantity,
      totalValue: finalUnitValue * finalQuantity,
      status: 'AVAILABLE'
    };

    onAddPrize(newPrize);
    setName('');
    setDescription('');
    setUnitValue(0);
    setQuantity(1);
    setPrizeType('ITEM');
    setShowAddModal(false);

    if (isSupabaseConfigured()) {
      setCloudMsg({ text: `Prize ${nextId} added and synced to Supabase Cloud!` });
      setTimeout(() => setCloudMsg(null), 3000);
    } else {
      setCloudMsg({ text: `Prize ${nextId} saved locally. (Offline Mode: Not pushed to Supabase Cloud)` });
      setTimeout(() => setCloudMsg(null), 4000);
    }
  };

  const totalPrizeUnits = prizes.reduce((s, p) => s + p.quantity, 0);
  const totalDrawnUnits = prizes.reduce((s, p) => s + p.drawnQuantity, 0);
  const totalRemainingUnits = prizes.reduce((s, p) => s + p.remainingQuantity, 0);
  const totalCashWorth = prizes.reduce((s, p) => s + (p.unitValue > 0 ? p.totalValue : 0), 0);
  const totalPhysicalUnits = prizes.filter((p) => p.unitValue <= 0).reduce((s, p) => s + p.quantity, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-wider text-[var(--ink-muted)]">Total Prize Lots</div>
          <div className="text-xl sm:text-2xl font-black text-[var(--ink)] mt-1">{prizes.length}</div>
        </div>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-wider text-[var(--ink-muted)]">Total Units</div>
          <div className="text-xl sm:text-2xl font-black text-[var(--ink)] mt-1">{totalPrizeUnits}</div>
        </div>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-wider text-[var(--ink-muted)]">Remaining Units</div>
          <div className="text-xl sm:text-2xl font-black text-[var(--accent)] mt-1">{totalRemainingUnits}</div>
        </div>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-wider text-[var(--ink-muted)]">Total Cash Fund</div>
          <div className="text-xl sm:text-2xl font-black text-[var(--ink)] mt-1">₱{totalCashWorth.toLocaleString()}</div>
          {totalPhysicalUnits > 0 && (
            <div className="text-[10px] text-[var(--ink-muted)] font-bold mt-0.5">
              + {totalPhysicalUnits} physical item unit{totalPhysicalUnits > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Offline Mode Alert */}
      {!isSupabaseConfigured() && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs flex items-start gap-2.5 text-amber-500 dark:text-amber-300">
          <CloudOff className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div className="font-black uppercase tracking-wider">Offline Mode Active (Supabase Disconnected)</div>
            <p className="opacity-80 text-[11px] leading-relaxed">
              Prizes added right now will only be saved in your current browser session. To have prizes automatically show up in your Supabase SQL database and sync live to other tablets/projectors, enter your <strong className="font-bold underline">Supabase URL &amp; Anon Key</strong> in the <strong>Settings</strong> tab.
            </p>
          </div>
        </div>
      )}

      {/* Cloud Sync Status Feedback Banner */}
      {cloudMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
            cloudMsg.error
              ? 'bg-red-500/15 border-red-500/40 text-red-500 dark:text-red-300'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {cloudMsg.error ? (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <span className="font-bold">{cloudMsg.text}</span>
          </div>
          <button onClick={() => setCloudMsg(null)} className="opacity-60 hover:opacity-100 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-black text-lg sm:text-xl text-[var(--ink)] uppercase tracking-tight leading-none">
              PRIZE INVENTORY
            </h3>
            <span
              className={`font-mono text-[9px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isSupabaseConfigured()
                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {isSupabaseConfigured() ? 'Cloud Live' : 'Offline Mode'}
            </span>
          </div>
          <p className="text-[11px] text-[var(--ink-muted)] font-medium mt-1">
            Primary setting is Prize Quantity. System auto-computes Total Winners &amp; Estimated Value.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isSupabaseConfigured() && prizes.length > 0 && (
            <button
              onClick={handleSyncToCloud}
              disabled={syncingCloud}
              className="px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Push current local prizes inventory to Supabase Cloud"
            >
              <UploadCloud className={`w-4 h-4 ${syncingCloud ? 'animate-bounce' : ''}`} />
              <span>{syncingCloud ? 'Syncing...' : 'Sync to Cloud'}</span>
            </button>
          )}

          {prizes.length > 0 && onClearAllPrizes && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all prizes from inventory?')) {
                  onClearAllPrizes();
                }
              }}
              className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--ink-muted)] hover:text-red-500 hover:border-red-500/40 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Prize</span>
          </button>
        </div>
      </div>

      {/* Prize Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--ink-muted)] uppercase font-bold tracking-wider text-[10px]">
                <th className="p-3">Prize ID</th>
                <th className="p-3">Prize Name</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Unit Value</th>
                <th className="p-3 text-center">Total Qty</th>
                <th className="p-3 text-center">Drawn</th>
                <th className="p-3 text-center">Remaining</th>
                <th className="p-3 text-right">Total Value</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {prizes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[var(--ink-muted)] font-mono text-xs uppercase tracking-wider">
                    No prizes in inventory. Click &quot;+ Add New Prize&quot; above to configure event prizes.
                  </td>
                </tr>
              ) : (
                prizes.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                    <td className="p-3 font-mono font-bold text-[var(--ink)]">{p.id}</td>
                    <td className="p-3 font-bold text-[var(--ink)] uppercase whitespace-nowrap">{p.name}</td>
                    <td className="p-3 text-[var(--ink-muted)] max-w-xs truncate">{p.description}</td>
                    <td className="p-3 text-right font-bold text-[var(--ink)]">
                      {p.unitValue > 0 ? (
                        `₱${p.unitValue.toLocaleString()}`
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-[var(--surface-elevated)] text-[var(--ink-muted)] border border-[var(--border)] font-mono text-[9px] font-bold uppercase tracking-wider">
                          Item / Gift
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold text-[var(--ink)]">{p.quantity}</td>
                    <td className="p-3 text-center text-[var(--ink-muted)] font-bold">{p.drawnQuantity}</td>
                    <td className="p-3 text-center">
                      <span className="font-black text-sm text-[var(--accent)]">{p.remainingQuantity}</span>
                    </td>
                    <td className="p-3 text-right font-bold text-[var(--ink)]">
                      {p.unitValue > 0 ? (
                        `₱${p.totalValue.toLocaleString()}`
                      ) : (
                        <span className="text-[var(--ink-muted)] font-mono font-bold">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                          p.status === 'AVAILABLE'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {onDeletePrize && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${p.name} (${p.id})?`)) {
                              onDeletePrize(p.id);
                            }
                          }}
                          className="p-1.5 text-[var(--ink-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                          title="Delete Prize"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Prize Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[var(--surface-card)] border border-[var(--border)] max-w-md w-full rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-elevated)]">
              <h3 className="font-black text-[var(--ink)] text-base uppercase tracking-tight">Add New Raffle Prize</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--ink-muted)] hover:text-[var(--ink)] p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              {/* Prize Category Selector */}
              <div>
                <label className="block font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] mb-1.5">
                  Prize Type:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPrizeType('ITEM');
                      setUnitValue(0);
                    }}
                    className={`py-2 px-3 rounded-lg border font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      prizeType === 'ITEM'
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow'
                        : 'bg-[var(--surface-elevated)] text-[var(--ink-muted)] border-[var(--border)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Physical Item / Gift</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrizeType('CASH');
                      if (unitValue <= 0) setUnitValue(1000);
                    }}
                    className={`py-2 px-3 rounded-lg border font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      prizeType === 'CASH'
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow'
                        : 'bg-[var(--surface-elevated)] text-[var(--ink-muted)] border-[var(--border)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <span className="font-mono font-black text-sm leading-none">₱</span>
                    <span>Cash Prize</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] mb-1">Prize Name:</label>
                <input
                  type="text"
                  required
                  placeholder={prizeType === 'ITEM' ? 'e.g. ELECTRIC FAN, SMART TV, RICE COOKER' : 'e.g. ₱1,000 CASH PRIZE'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--ink)] outline-none focus:border-[var(--accent)] uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] mb-1">
                  {prizeType === 'ITEM' ? 'Sponsor / Donor / Remarks:' : 'Description / Remarks:'}
                </label>
                <input
                  type="text"
                  placeholder={prizeType === 'ITEM' ? 'e.g. SPONSORED BY: LANDBANK' : 'e.g. Teachers Day Special Cash Incentive'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--ink)] outline-none focus:border-[var(--accent)] font-medium"
                />
              </div>

              {prizeType === 'CASH' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] mb-1">Unit Value (₱):</label>
                    <input
                      type="number"
                      min="1"
                      step="50"
                      required
                      value={unitValue}
                      onChange={(e) => setUnitValue(Number(e.target.value))}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--ink)] outline-none focus:border-[var(--accent)] font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] mb-1">Quantity Available:</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--ink)] outline-none focus:border-[var(--accent)] font-bold"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] mb-1">Quantity Available (Units):</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--ink)] outline-none focus:border-[var(--accent)] font-bold"
                  />
                </div>
              )}

              <div className="rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] p-3 text-[var(--ink-muted)] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Calculated Winners:</span>
                  <span className="text-[var(--ink)] font-bold">{quantity} Winner{quantity > 1 ? 's' : ''}</span>
                </div>
                {prizeType === 'CASH' ? (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Calculated Value:</span>
                    <span className="text-[var(--accent)] font-black text-sm">₱{(unitValue * quantity).toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Prize Category:</span>
                    <span className="text-[var(--ink)] font-mono font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-[var(--surface-card)] border border-[var(--border)]">
                      Physical Item / Sponsored Gift
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-elevated)] font-bold uppercase text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-bold uppercase text-xs tracking-wider shadow cursor-pointer transition-opacity"
                >
                  Save Prize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
