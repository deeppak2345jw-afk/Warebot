import React, { useState, useEffect } from 'react';
import {
  Box,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  Truck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';
import { TaskPriority } from '../../core/types';

export const CreateTaskModal: React.FC = () => {
  const isCreateTaskModalOpen = useUIStore((s) => s.isCreateTaskModalOpen);
  const setCreateTaskModalOpen = useUIStore((s) => s.setCreateTaskModalOpen);

  const products = useSimulationStore((s) => s.products);
  const deliveryNodes = useSimulationStore((s) => s.deliveryNodes);
  const createManualTask = useSimulationStore((s) => s.createManualTask);

  const [productId, setProductId] = useState<string>(() => {
    const inStock = products.find((p) => p.quantity > 0) || products[0];
    return inStock ? inStock.id : '';
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryNodeId, setDeliveryNodeId] = useState<string>('D-01');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [notes, setNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isCreateTaskModalOpen) return null;

  const selectedProduct = products.find((p) => p.id === productId);
  const maxStock = selectedProduct ? selectedProduct.quantity : 0;
  const isOverCapacity = quantity > 3;
  const numSubtasks = Math.ceil(quantity / 3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setFeedback({ type: 'error', message: 'Please select a valid product' });
      return;
    }

    if (quantity <= 0) {
      setFeedback({ type: 'error', message: 'Quantity must be at least 1' });
      return;
    }

    if (quantity > maxStock) {
      setFeedback({
        type: 'error',
        message: `Insufficient inventory. Available stock for ${selectedProduct.name} is ${maxStock}.`,
      });
      return;
    }

    const result = createManualTask({
      productId: selectedProduct.id,
      requestedQuantity: quantity,
      shelfId: selectedProduct.shelfId,
      deliveryNodeId,
      priority,
      notes,
    });

    if (result.success) {
      setFeedback({
        type: 'success',
        message: result.message,
      });
      setTimeout(() => {
        setCreateTaskModalOpen(false);
      }, 1200);
    } else {
      setFeedback({
        type: 'error',
        message: result.message,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-warehouse-card border border-warehouse-border w-full max-w-lg rounded-xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-warehouse-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white font-mono">Create Warehouse Task</h2>
              <p className="text-xs text-gray-400">Dispatch an AGV to retrieve items from storage to dock</p>
            </div>
          </div>
          <button
            onClick={() => setCreateTaskModalOpen(false)}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-warehouse-darker transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                : 'bg-red-950/40 text-red-300 border-red-800/40'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Product Selection */}
          <div className="space-y-1.5">
            <label className="text-gray-300 font-semibold flex items-center justify-between">
              <span>SELECT PRODUCT & SHELF</span>
              {selectedProduct && (
                <span className="text-gray-400 font-normal">
                  In Stock: <strong className={selectedProduct.quantity > 0 ? 'text-cyan-400' : 'text-red-400'}>{selectedProduct.quantity}</strong>
                </span>
              )}
            </label>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setQuantity(1);
              }}
              className="w-full bg-warehouse-darker border border-warehouse-border rounded-lg p-2.5 text-white focus:border-cyan-500 focus:outline-none"
            >
              {products.map((prod) => (
                <option key={prod.id} value={prod.id} disabled={prod.quantity === 0}>
                  {prod.name} ({prod.category}) — Shelf {prod.shelfId} [{prod.quantity} units available]
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Capacity Warning */}
          <div className="space-y-1.5">
            <label className="text-gray-300 font-semibold flex items-center justify-between">
              <span>REQUESTED QUANTITY</span>
              <span className="text-gray-400 font-normal">AGV Max Load: 3 items</span>
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-lg bg-warehouse-darker border border-warehouse-border text-white text-base hover:bg-warehouse-border transition font-bold"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={maxStock || 1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 bg-warehouse-darker border border-warehouse-border rounded-lg p-2.5 text-center text-white font-bold text-sm focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => (maxStock ? Math.min(maxStock, q + 1) : q + 1))}
                className="w-10 h-10 rounded-lg bg-warehouse-darker border border-warehouse-border text-white text-base hover:bg-warehouse-border transition font-bold"
              >
                +
              </button>
            </div>

            {/* Capacity Splitting Notice */}
            {isOverCapacity && (
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px] flex items-start gap-2 mt-1">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Capacity constraint notice:</span> AGVs can carry a maximum of 3 items per trip.
                  This request of {quantity} items will be automatically partitioned into{' '}
                  <strong className="text-amber-200">{numSubtasks} separate trips</strong>.
                </div>
              </div>
            )}
          </div>

          {/* Delivery Node Selection */}
          <div className="space-y-1.5">
            <label className="text-gray-300 font-semibold">DESTINATION DELIVERY NODE</label>
            <select
              value={deliveryNodeId}
              onChange={(e) => setDeliveryNodeId(e.target.value)}
              className="w-full bg-warehouse-darker border border-warehouse-border rounded-lg p-2.5 text-white focus:border-cyan-500 focus:outline-none"
            >
              {deliveryNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.id}: {node.name} (Coord: {node.coord.x}, {node.coord.y})
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-gray-300 font-semibold">TASK PRIORITY</label>
            <div className="grid grid-cols-3 gap-2">
              {(['normal', 'high', 'critical'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 px-3 rounded-lg border text-center uppercase font-mono font-bold text-xs transition ${
                    priority === p
                      ? p === 'critical'
                        ? 'bg-red-500 text-white border-red-400 shadow-md shadow-red-500/30'
                        : p === 'high'
                        ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30'
                        : 'bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/30'
                      : 'bg-warehouse-darker text-gray-400 border-warehouse-border hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="text-gray-400">NOTES / WORK ORDER REF (OPTIONAL)</label>
            <input
              type="text"
              placeholder="e.g., Express order #8491 to Dock D-01"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-warehouse-darker border border-warehouse-border rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none placeholder:text-gray-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-warehouse-border flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setCreateTaskModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-warehouse-darker border border-warehouse-border text-gray-300 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono transition shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatch Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
