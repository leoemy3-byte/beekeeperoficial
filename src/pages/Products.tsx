import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', supplier: '', 
    cost: 0, price: 0, stock: 0, minStock: 0, 
    location: '', barcode: '', notes: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods: any[] = [];
      snapshot.forEach(doc => prods.push({ id: doc.id, ...doc.data() }));
      setProducts(prods);
    });
    return () => unsub();
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const productData = {
        ...formData,
        cost: Number(formData.cost),
        price: Number(formData.price),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        updatedAt: serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (err) {
      setError('Erro ao salvar produto. Verifique os dados.');
      console.error(err);
    }
  };

  const handleDeleteClick = (id: string) => {
    if (user?.role !== 'admin') {
      setError('Apenas administradores podem excluir produtos.');
      return;
    }
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'products', deleteConfirm));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Erro ao excluir:', err);
      setError('Erro ao excluir produto.');
    }
  };

  const openModal = (product: any = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name, sku: product.sku, category: product.category || '',
        supplier: product.supplier || '', cost: product.cost || 0, price: product.price || 0,
        stock: product.stock, minStock: product.minStock, location: product.location || '',
        barcode: product.barcode || '', notes: product.notes || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '', sku: '', category: '', supplier: '', cost: 0, price: 0,
        stock: 0, minStock: 0, location: '', barcode: '', notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Produtos</h2>
        <button
          onClick={() => openModal()}
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]"
        >
          <Plus className="w-5 h-5" />
          Novo Produto
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome, SKU ou categoria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#141414] border border-yellow-500/20 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
        />
      </div>

      {/* Products Table */}
      <div className="bg-[#141414] border border-yellow-500/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-yellow-500/10 text-gray-400 text-sm">
                <th className="p-4 font-medium">SKU</th>
                <th className="p-4 font-medium">Nome</th>
                <th className="p-4 font-medium">Categoria</th>
                <th className="p-4 font-medium text-right">Estoque</th>
                <th className="p-4 font-medium text-right">Custo</th>
                <th className="p-4 font-medium text-right">Preço</th>
                <th className="p-4 font-medium text-right">Margem</th>
                <th className="p-4 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-yellow-500/5">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 text-gray-300 font-mono text-sm">{product.sku}</td>
                  <td className="p-4 text-white font-medium">
                    {product.name}
                    {product.stock <= product.minStock && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                        Estoque Baixo
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-gray-400">{product.category || '-'}</td>
                  <td className={`p-4 text-right font-bold ${product.stock <= product.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                    {product.stock}
                  </td>
                  <td className="p-4 text-right text-gray-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.cost || 0)}
                  </td>
                  <td className="p-4 text-right text-gray-300">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price || 0)}
                  </td>
                  <td className="p-4 text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      (product.price > product.cost && product.cost > 0) ? 'bg-emerald-500/10 text-emerald-500' : 
                      (product.price < product.cost && product.cost > 0) ? 'bg-red-500/10 text-red-500' : 
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {product.cost > 0 ? (((product.price - product.cost) / product.cost) * 100).toFixed(1) + '%' : '-'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(product)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {user?.role === 'admin' && (
                        <button onClick={() => handleDeleteClick(product.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141414] border border-yellow-500/20 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-yellow-500/10 flex justify-between items-center bg-white/5">
                <h3 className="text-xl font-bold text-white">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <form id="productForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Nome do Produto *</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">SKU *</label>
                    <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Categoria</label>
                    <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Fornecedor</label>
                    <input type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Custo (R$)</label>
                    <input type="number" step="0.01" value={formData.cost} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-400">Preço de Venda (R$)</label>
                      {formData.cost > 0 && formData.price > 0 && (
                        <span className={`text-xs font-bold ${formData.price > formData.cost ? 'text-emerald-500' : 'text-red-500'}`}>
                          Margem: {(((formData.price - formData.cost) / formData.cost) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Estoque Atual *</label>
                    <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Estoque Mínimo *</label>
                    <input required type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Localização</label>
                    <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Código de Barras</label>
                    <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-400">Observações</label>
                    <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 resize-none" />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-yellow-500/10 bg-white/5 flex justify-end gap-4">
                <button onClick={closeModal} className="px-6 py-2.5 rounded-xl text-gray-400 font-medium hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="productForm" className="px-6 py-2.5 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                  Salvar Produto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141414] border border-red-500/20 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-red-500/10 flex justify-between items-center bg-red-500/5">
                <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  Confirmar Exclusão
                </h3>
              </div>
              <div className="p-6">
                <p className="text-gray-300">
                  Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita e o produto será removido permanentemente.
                </p>
              </div>
              <div className="p-6 border-t border-red-500/10 bg-white/5 flex justify-end gap-4">
                <button onClick={() => setDeleteConfirm(null)} className="px-6 py-2.5 rounded-xl text-gray-400 font-medium hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmDelete} className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
