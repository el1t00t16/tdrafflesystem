'use client';

import React, { useState } from 'react';
import { Prize } from '../../lib/types';
import { Gift, Plus, CheckCircle, AlertCircle, X } from 'lucide-react';

interface PrizesManagerProps {
  prizes: Prize[];
  onAddPrize: (prize: Prize) => void;
}

export const PrizesManager: React.FC<PrizesManagerProps> = ({ prizes, onAddPrize }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitValue, setUnitValue] = useState<number>(1000);
  const [quantity, setQuantity] = useState<number>(3);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || quantity <= 0) return;

    const nextId = `P${String(prizes.length + 1).padStart(3, '0')}`;
    const newPrize: Prize = {
      id: nextId,
      name: name.trim(),
      description: description.trim(),
      unitValue: Number(unitValue) || 0,
      quantity: Number(quantity) || 1,
      drawnQuantity: 0,
      remainingQuantity: Number(quantity) || 1,
      totalValue: (Number(unitValue) || 0) * (Number(quantity) || 1),
      status: 'AVAILABLE'
    };

    onAddPrize(newPrize);
    setName('');
    setDescription('');
    setUnitValue(1000);
    setQuantity(3);
    setShowAddModal(false);
  };

  const totalPrizeUnits = prizes.reduce((s, p) => s + p.quantity, 0);
  const totalDrawnUnits = prizes.reduce((s, p) => s + p.drawnQuantity, 0);
  const totalRemainingUnits = prizes.reduce((s, p) => s + p.remainingQuantity, 0);
  const totalPrizeWorth = prizes.reduce((s, p) => s + p.totalValue, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#121212] border border-white/10 p-4 border-t-2 border-t-white">
          <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total Prize Lots</div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">{prizes.length}</div>
        </div>
        <div className="bg-[#121212] border border-white/10 p-4 border-t-2 border-t-[#FF1E1E]">
          <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total Units</div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">{totalPrizeUnits}</div>
        </div>
        <div className="bg-[#121212] border border-white/10 p-4 border-t-2 border-t-white">
          <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Remaining Units</div>
          <div className="text-xl sm:text-2xl font-black text-[#FF1E1E] mt-1">{totalRemainingUnits}</div>
        </div>
        <div className="bg-[#121212] border border-white/10 p-4 border-t-2 border-t-[#FF1E1E]">
          <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total Prize Fund</div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">₱{totalPrizeWorth.toLocaleString()}</div>
        </div>
      </div>

      {/* Header Bar */}
      <div className="bg-[#121212] border border-white/10 p-5 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative border-t-2 border-t-[#FF1E1E]">
        <div>
          <h3 className="font-black text-lg sm:text-xl text-white uppercase tracking-tight leading-none">PRIZE INVENTORY</h3>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
            Primary setting is Prize Quantity. The system automatically computes Total Winners &amp; Total Value.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#FF1E1E] hover:bg-[#ff3838] text-white font-black text-xs uppercase tracking-wider shadow transition-all flex items-center gap-1.5 rounded-none"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Prize</span>
        </button>
      </div>

      {/* Prize Table */}
      <div className="bg-[#121212] border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-black border-b border-white/20 text-neutral-300 uppercase font-black tracking-widest text-[10px]">
                <th className="p-3">Prize ID</th>
                <th className="p-3">Prize Name</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Unit Value</th>
                <th className="p-3 text-center">Total Qty</th>
                <th className="p-3 text-center">Drawn</th>
                <th className="p-3 text-center">Remaining</th>
                <th className="p-3 text-right">Total Value</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {prizes.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-900/50 transition-colors">
                  <td className="p-3 font-mono font-black text-white">{p.id}</td>
                  <td className="p-3 font-black text-white uppercase whitespace-nowrap">{p.name}</td>
                  <td className="p-3 text-neutral-400 max-w-xs truncate">{p.description}</td>
                  <td className="p-3 text-right font-bold text-white">
                    ₱{p.unitValue.toLocaleString()}
                  </td>
                  <td className="p-3 text-center font-bold text-neutral-300">{p.quantity}</td>
                  <td className="p-3 text-center text-neutral-400 font-bold">{p.drawnQuantity}</td>
                  <td className="p-3 text-center">
                    <span className="font-black text-sm text-[#FF1E1E]">{p.remainingQuantity}</span>
                  </td>
                  <td className="p-3 text-right font-black text-white">
                    ₱{p.totalValue.toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 font-black text-[9px] uppercase tracking-widest ${
                        p.status === 'AVAILABLE'
                          ? 'bg-neutral-900 text-white border border-white/30'
                          : 'bg-neutral-950 text-neutral-500 border border-white/10'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Prize Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0A0A0A] border-2 border-[#FF1E1E] max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-black px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-black text-white text-base sm:text-lg uppercase tracking-tight">Add New Raffle Prize</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-300 mb-1">Prize Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ₱1,000 Cash Prize or Smart TV"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/15 p-2.5 text-white outline-none focus:border-[#FF1E1E] uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-300 mb-1">Description:</label>
                <input
                  type="text"
                  placeholder="e.g. Cash incentive for Teachers Day"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/15 p-2.5 text-white outline-none focus:border-[#FF1E1E] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-300 mb-1">Unit Value (₱):</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={unitValue}
                    onChange={(e) => setUnitValue(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-white/15 p-2.5 text-white outline-none focus:border-[#FF1E1E] font-bold"
                  />
                </div>

                <div>
                  <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-300 mb-1">Quantity Available:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-white/15 p-2.5 text-white outline-none focus:border-[#FF1E1E] font-bold"
                  />
                </div>
              </div>

              <div className="bg-neutral-950 border border-white/10 p-3 text-neutral-400 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider">Calculated Winners:</span>
                  <span className="text-white font-black">{quantity} Winners</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider">Total Calculated Value:</span>
                  <span className="text-[#FF1E1E] font-black">₱{(unitValue * quantity).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-white/20 text-neutral-300 hover:bg-neutral-900 font-bold uppercase text-xs"
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
