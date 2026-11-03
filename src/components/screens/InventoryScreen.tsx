import React, { useState } from 'react';
import {
  Package,
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Send,
  Boxes,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';
import { Product } from '../../core/types';

export const InventoryScreen: React.FC = () => {
  const products = useSimulationStore((s) => s.products);
  const addProduct = useSimulationStore((s) => s.addProduct);
  const editProduct = useSimulationStore((s) => s.editProduct);
  const deleteProduct = useSimulationStore((s) => s.deleteProduct);
  const shelfNodes = useSimulationStore((s) => s.engine.shelfNodes);
  const setCreateTaskModalOpen = useUIStore((s) => s.setCreateTaskModalOpen);
  const setActiveScreen = useUIStore((s) => s.setActiveScreen);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Electronics');
  const [formQuantity, setFormQuantity] = useState(10);
  const [formWeight, setFormWeight] = useState(1.5);
  const [formShelfId, setFormShelfId] = useState('A-01');

  const availableShelves = Array.from(new Set(shelfNodes.map((s) => s.shelfId).filter(Boolean))) as string[];

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.shelfId.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const handleOpenAdd = () => {
    setFormName('');
    setFormCategory('Electronics');
    setFormQuantity(10);
    setFormWeight(1.5);
    setFormShelfId(availableShelves[0] || 'A-01');
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    addProduct({
      name: formName.trim(),
      category: formCategory,
      quantity: Number(formQuantity),
      weightKg: Number(formWeight),
      shelfId: formShelfId,
    });

    setIsAddModalOpen(false);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormQuantity(p.quantity);
    setFormWeight(p.weightKg);
    setFormShelfId(p.shelfId);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    editProduct(editingProduct.id, {
      name: formName.trim(),
      category: formCategory,
      quantity: Number(formQuantity),
      weightKg: Number(formWeight),
      shelfId: formShelfId,
    });

    setEditingProduct(null);
  };

  const handleDispatchForProduct = (p: Product) => {
    // Open task board with this product pre-selected
    setActiveScreen('tasks');
    setCreateTaskModalOpen(true);
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-warehouse-dark text-gray-200 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-warehouse-border">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-cyan-400" />
              <span>Warehouse Inventory & Shelf Stock Management</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Define particular products, assign SKU quantities to specific physical storage racks, and manage stock availability.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition shadow-md shadow-cyan-500/20"
          >
            <PlusCircle className="w-4 h-4 fill-current" />
            <span>Add New Product</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name, ID, or shelf..."
              className="w-full bg-warehouse-card border border-warehouse-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="flex items-center space-x-1 bg-warehouse-card p-1 rounded-lg border border-warehouse-border text-xs font-mono">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded capitalize transition ${
                  selectedCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-warehouse-card rounded-xl border border-warehouse-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-warehouse-darker/70 border-b border-warehouse-border text-gray-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Product ID</th>
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Shelf Location</th>
                  <th className="p-3.5">Quantity</th>
                  <th className="p-3.5">Weight</th>
                  <th className="p-3.5">Availability</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warehouse-border/50">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500 italic">
                      No products found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-warehouse-border/30 transition">
                      <td className="p-3.5 font-bold text-cyan-300">{p.id}</td>
                      <td className="p-3.5 font-semibold text-white">{p.name}</td>
                      <td className="p-3.5 text-gray-400">{p.category}</td>
                      <td className="p-3.5">
                        <span className="bg-purple-950/40 text-purple-300 px-2 py-0.5 rounded border border-purple-800/40 font-bold">
                          Shelf {p.shelfId}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`font-bold ${p.quantity === 0 ? 'text-red-400' : p.quantity < 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {p.quantity} units
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-300">{p.weightKg} kg</td>
                      <td className="p-3.5">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                            p.status === 'in_stock'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : p.status === 'low_stock'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleDispatchForProduct(p)}
                          title="Create Manual Task for this Product"
                          className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition text-[10px]"
                        >
                          Dispatch
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Quantity / Shelf"
                          className="p-1 rounded text-gray-400 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          title="Delete Product"
                          className="p-1 rounded text-gray-400 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-warehouse-card border border-warehouse-border w-full max-w-md rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-warehouse-border">
              <h2 className="font-bold text-sm text-white font-mono">Add Product to Inventory</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-gray-400">PRODUCT NAME</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Laptop, Keyboard, Microprocessor"
                  className="w-full bg-warehouse-darker border border-warehouse-border rounded p-2 text-white mt-1 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400">CATEGORY</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-warehouse-darker border border-warehouse-border rounded p-2 text-white mt-1"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Peripherals">Peripherals</option>
                    <option value="Displays">Displays</option>
                    <option value="Power">Power</option>
                    <option value="Semiconductors">Semiconductors</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Networking">Networking</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400">ASSIGN TO SHELF</label>
                  <select
                    value={formShelfId}
                    onChange={(e) => setFormShelfId(e.target.value)}
                    className="w-full bg-warehouse-darker border border-warehouse-border rounded p-2 text-white mt-1"
                  >
                    {availableShelves.map((s) => (
                      <option key={s} value={s}>Shelf {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400">INITIAL QUANTITY</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    className="w-full bg-warehouse-darker border border-warehouse-border rounded p-2 text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-gray-400">WEIGHT (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="20"
                    value={formWeight}
                    onChange={(e) => setFormWeight(Number(e.target.value))}
                    className="w-full bg-warehouse-darker border border-warehouse-border rounded p-2 text-white mt-1"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-warehouse-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-warehouse-darker hover:bg-warehouse-border text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-md"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-warehouse-card border border-warehouse-border w-full max-w-md rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-warehouse-border">
              <h2 className="font-bold text-sm text-white font-mono">Edit Product: {editingProduct.id}</h2>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-gray-400">PRODUCT NAME</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-warehouse-darker border border-warehouse-border rounded p-2 text-white mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400">SHELF LOCATION</label>
                  <select
                    value={formShelfId}
                    onChange={(e) => setFormShelfId(e.target.value)}
                    className="w-full bg-warehouse-darker border border-warehouse-border rounded p-2 text-white mt-1"
                  >
                    {availableShelves.map((s) => (
                      <option key={s} value={s}>Shelf {s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400">CURRENT STOCK</label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    className="w-full bg-warehouse-darker border border-warehouse-border rounded p-2 text-white mt-1"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-warehouse-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3 py-1.5 rounded bg-warehouse-darker hover:bg-warehouse-border text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-md"
                >
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
