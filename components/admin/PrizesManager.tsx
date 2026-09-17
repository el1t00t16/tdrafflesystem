'use client';

import React, { useState } from 'react';
import { Prize, PrizeCategory } from '../../lib/types';
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
  const [category, setCategory] = useState<PrizeCategory>('MINOR');
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
      status: 'AVAILABLE',
      category: category
    };

    onAddPrize(newPrize);
    setName('');
    setDescription('');
    setUnitValue(0);
    setQuantity(1);
    setCategory('MINOR');
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

  const renderCategoryBadge = (cat?: PrizeCategory) => {
    switch (cat) {
      case 'GRAND':
        return (
          <span className="px-2 py-0.5 font-black text-[9px] uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
            ★ Grand Prize
          </span>
        );
      case 'MAJOR':
        return (
          <span className="px-2 py-0.5 font-black text-[9px] uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 whitespace-nowrap">
            ◆ Major Prize
          </span>
        );
      case 'CONSOLATION':
        return (
          <span className="px-2 py-0.5 font-black text-[9px] uppercase tracking-wider bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/30 whitespace-nowrap">
            Consolation
          </span>
        );
      case 'MINOR':
      default:
        return (
          <span className="px-2 py-0.5 font-black text-[9px] uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 whitespace-nowrap">
            ● Minor Prize
          </span>
        );
    }
  };

  const totalPrizeUnits = prizes.reduce((s, p) => s + p.quantity, 0);
  const totalDrawnUnits = prizes.reduce((s, p) => s + p.drawnQuantity, 0);
  const totalRemainingUnits = prizes.reduce((s, p) => s + p.remainingQuantity, 0);
  const totalCashWorth = prizes.reduce((s, p) => s + (p.unitValue > 0 ? p.totalValue : 0), 0);
  const totalPhysicalUnits = prizes.filter((p) => p.unitValue <= 0).reduce((s, p) => s + p.quantity, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-4 border-t-4 border-t-[#1a1a1a] dark:border-t-white shadow-sm">
          <div className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Total Prize Lots</div>
          <div className="text-xl sm:text-2xl font-black text-[#1a1a1a] dark:text-white mt-1">{prizes.length}</div>
        </div>
        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-4 border-t-4 border-t-[#FF1E1E] shadow-sm">
          <div className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Total Units</div>
          <div className="text-xl sm:text-2xl font-black text-[#1a1a1a] dark:text-white mt-1">{totalPrizeUnits}</div>
        </div>
        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-4 border-t-4 border-t-[#1a1a1a] dark:border-t-white shadow-sm">
          <div className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Remaining Units</div>
          <div className="text-xl sm:text-2xl font-black text-[#FF1E1E] mt-1">{totalRemainingUnits}</div>
        </div>
        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-4 border-t-4 border-t-[#FF1E1E] shadow-sm">
          <div className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Total Cash Fund</div>
          <div className="text-xl sm:text-2xl font-black text-[#1a1a1a] dark:text-white mt-1">₱{totalCashWorth.toLocaleString()}</div>
          {totalPhysicalUnits > 0 && (
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold mt-0.5">
              + {totalPhysicalUnits} physical item unit{totalPhysicalUnits > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Offline Mode Alert */}
      {!isSupabaseConfigured() && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-500/30 p-3.5 text-xs flex items-start gap-2.5 text-yellow-900 dark:text-yellow-300">
          <CloudOff className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div className="font-black uppercase tracking-wider">Offline Mode Active (Supabase Disconnected)</div>
            <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
              Prizes added right now will only be saved in your current browser session. To have prizes automatically show up in your Supabase SQL database and sync live to other tablets/projectors, enter your <strong className="text-black dark:text-white">Supabase URL &amp; Anon Key</strong> in the <strong>Settings</strong> tab.
            </p>
          </div>
        </div>
      )}

      {/* Cloud Sync Status Feedback Banner */}
      {cloudMsg && (
        <div
          className={`p-3 text-xs flex items-center justify-between border ${
            cloudMsg.error
              ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {cloudMsg.error ? (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span className="font-bold">{cloudMsg.text}</span>
          </div>
          <button onClick={() => setCloudMsg(null)} className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative border-t-4 border-t-[#FF1E1E]">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-black text-lg sm:text-xl text-[#1a1a1a] dark:text-white uppercase tracking-tight leading-none">
              PRIZE INVENTORY
            </h3>
            <span
              className={`font-mono text-[9px] px-2 py-0.5 border font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isSupabaseConfigured()
                  ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'border-yellow-500/40 text-yellow-800 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSupabaseConfigured() ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-yellow-500 dark:bg-yellow-400'
                }`}
              />
              {isSupabaseConfigured() ? 'Cloud Live' : 'Offline Mode'}
            </span>
          </div>
          <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
            Primary setting is Prize Quantity. The system automatically computes Total Winners &amp; Total Value.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isSupabaseConfigured() && prizes.length > 0 && (
            <button
              onClick={handleSyncToCloud}
              disabled={syncingCloud}
              className="px-3.5 py-2.5 bg-[#1a1a1a] dark:bg-neutral-900 hover:bg-[#ff6a00] border border-emerald-500/40 text-emerald-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
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
              className="px-3 py-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-red-50 dark:hover:bg-neutral-800 border border-[#1a1a1a]/30 dark:border-white/20 text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#FF1E1E] hover:bg-[#ff3838] text-white font-black text-xs uppercase tracking-wider shadow transition-all flex items-center gap-1.5 rounded-none"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Prize</span>
          </button>
        </div>
      </div>

      {/* Prize Table */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#1a1a1a] dark:border-white/20 text-white uppercase font-mono font-bold tracking-wider text-[10px]">
                <th className="p-3">Prize ID</th>
                <th className="p-3">Prize Name</th>
                <th className="p-3 text-center">Tier</th>
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
            <tbody className="divide-y divide-[#1a1a1a]/15 dark:divide-white/5">
              {prizes.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-neutral-500 font-mono text-xs uppercase tracking-wider">
                    No prizes in inventory. Click &quot;+ Add New Prize&quot; above to configure event prizes.
                  </td>
                </tr>
              ) : (
                prizes.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f8f7f4] dark:hover:bg-neutral-900/50 transition-colors">
                    <td className="p-3 font-mono font-black text-[#1a1a1a] dark:text-white">{p.id}</td>
                    <td className="p-3 font-black text-[#1a1a1a] dark:text-white uppercase whitespace-nowrap">{p.name}</td>
                    <td className="p-3 text-center">{renderCategoryBadge(p.category)}</td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-400 max-w-xs truncate">{p.description}</td>
                    <td className="p-3 text-right font-bold text-[#1a1a1a] dark:text-white">
                      {p.unitValue > 0 ? (
                        `₱${p.unitValue.toLocaleString()}`
                      ) : (
                        <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-[#1a1a1a]/20 dark:border-white/10 font-mono text-[9px] font-bold uppercase tracking-wider">
                          Item / Gift
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold text-neutral-700 dark:text-neutral-300">{p.quantity}</td>
                    <td className="p-3 text-center text-neutral-500 dark:text-neutral-400 font-bold">{p.drawnQuantity}</td>
                    <td className="p-3 text-center">
                      <span className="font-black text-sm text-[#FF1E1E]">{p.remainingQuantity}</span>
                    </td>
                    <td className="p-3 text-right font-black text-[#1a1a1a] dark:text-white">
                      {p.unitValue > 0 ? (
                        `₱${p.totalValue.toLocaleString()}`
                      ) : (
                        <span className="text-neutral-400 font-mono font-bold">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 font-black text-[9px] uppercase tracking-widest ${
                          p.status === 'AVAILABLE'
                            ? 'bg-[#1a1a1a] dark:bg-neutral-900 text-white border border-[#1a1a1a] dark:border-white/30'
                            : 'bg-neutral-200 dark:bg-neutral-950 text-neutral-500 border border-[#1a1a1a]/20 dark:border-white/10'
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
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors rounded-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/20 max-w-md w-full overflow-hidden shadow-2xl text-[#1a1a1a] dark:text-white">
            <div className="bg-[#1a1a1a] px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
              <h3 className="font-black text-white text-base sm:text-lg uppercase tracking-tight">Add New Raffle Prize</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              {/* Type of Prize (Tier) Selector */}
              <div>
                <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-600 dark:text-neutral-300 mb-1">
                  Type of Prize (Tier):
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PrizeCategory)}
                  className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/15 p-2.5 text-[#1a1a1a] dark:text-white outline-none focus:border-[#FF1E1E] uppercase font-bold text-xs"
                >
                  <option value="MINOR">Minor Prize</option>
                  <option value="MAJOR">Major Prize</option>
                  <option value="GRAND">Grand Prize</option>
                  <option value="CONSOLATION">Consolation Prize</option>
                </select>
              </div>

              {/* Reward Format Selector */}
              <div>
                <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                  Reward Format:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPrizeType('ITEM');
                      setUnitValue(0);
                    }}
                    className={`py-2 px-3 border font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all ${
                      prizeType === 'ITEM'
                        ? 'bg-[#FF1E1E] text-white border-[#FF1E1E] shadow'
                        : 'bg-[#f8f7f4] dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-[#1a1a1a]/20 dark:border-white/15 hover:border-[#1a1a1a] dark:hover:border-white/40'
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
                    className={`py-2 px-3 border font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all ${
                      prizeType === 'CASH'
                        ? 'bg-[#FF1E1E] text-white border-[#FF1E1E] shadow'
                        : 'bg-[#f8f7f4] dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-[#1a1a1a]/20 dark:border-white/15 hover:border-[#1a1a1a] dark:hover:border-white/40'
                    }`}
                  >
                    <span className="font-mono font-black text-sm leading-none">₱</span>
                    <span>Cash Prize</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-600 dark:text-neutral-300 mb-1">Prize Name:</label>
                <input
                  type="text"
                  required
                  placeholder={prizeType === 'ITEM' ? 'e.g. ELECTRIC FAN, SMART TV, RICE COOKER' : 'e.g. ₱1,000 CASH PRIZE'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/15 p-2.5 text-[#1a1a1a] dark:text-white outline-none focus:border-[#FF1E1E] uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-600 dark:text-neutral-300 mb-1">
                  {prizeType === 'ITEM' ? 'Sponsor / Donor / Remarks:' : 'Description / Remarks:'}
                </label>
                <input
                  type="text"
                  placeholder={prizeType === 'ITEM' ? 'e.g. SPONSORED BY: LANDBANK' : 'e.g. Teachers Day Special Cash Incentive'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/15 p-2.5 text-[#1a1a1a] dark:text-white outline-none focus:border-[#FF1E1E] font-medium"
                />
              </div>

              {prizeType === 'CASH' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-600 dark:text-neutral-300 mb-1">Unit Value (₱):</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      placeholder="e.g. 1000"
                      value={unitValue === 0 ? '' : unitValue}
                      onChange={(e) => setUnitValue(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/15 p-2.5 text-[#1a1a1a] dark:text-white outline-none focus:border-[#FF1E1E] font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-600 dark:text-neutral-300 mb-1">Quantity Available:</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/15 p-2.5 text-[#1a1a1a] dark:text-white outline-none focus:border-[#FF1E1E] font-bold"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-600 dark:text-neutral-300 mb-1">Quantity Available (Units):</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/15 p-2.5 text-[#1a1a1a] dark:text-white outline-none focus:border-[#FF1E1E] font-bold"
                  />
                </div>
              )}

              <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-3 text-neutral-600 dark:text-neutral-400 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider">Prize Tier:</span>
                  <div>{renderCategoryBadge(category)}</div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider">Calculated Winners:</span>
                  <span className="text-[#1a1a1a] dark:text-white font-black">{quantity} Winner{quantity > 1 ? 's' : ''}</span>
                </div>
                {prizeType === 'CASH' ? (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider">Total Calculated Value:</span>
                    <span className="text-[#FF1E1E] font-black">₱{(unitValue * quantity).toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider">Format:</span>
                    <span className="text-white font-mono font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 bg-[#1a1a1a] dark:bg-neutral-900 border border-[#1a1a1a] dark:border-white/10">
                      Physical Item / Sponsored Gift
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#1a1a1a]/30 dark:border-white/20 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 font-bold uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF1E1E] hover:bg-[#ff3838] text-white font-black uppercase text-xs tracking-wider shadow"
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
