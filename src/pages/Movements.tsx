import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Movements() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    productId: '',
    type: 'in',
    quantity: 1,
    reason: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods: any[] = [];
      snapshot.forEach(doc => prods.push({ id: doc.id, ...doc.data() }));
      setProducts(prods.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => unsub();
  }, []);

  const selectedProduct = products.find(p => p.id === formData.productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.productId) {
      setError('Selecione um produto.');
      return;
    }

    if (formData.quantity <= 0) {
      setError('A quantidade deve ser maior que zero.');
      return;
    }

    if (formData.type === 'out' && selectedProduct && formData.quantity > selectedProduct.stock) {
      setError(`Estoque insuficiente. Estoque atual: ${selectedProduct.stock}`);
      return;
    }

    setLoading(true);

    try {
      const productRef = doc(db, 'products', formData.productId);
      const movementRef = doc(collection(db, 'movements'));

      await runTransaction(db, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) {
          throw new Error('Produto não encontrado.');
        }

        const currentStock = productDoc.data().stock || 0;
        let newStock = currentStock;

        if (formData.type === 'in') {
          newStock += formData.quantity;
        } else if (formData.type === 'out') {
          if (currentStock < formData.quantity) {
            throw new Error('Estoque insuficiente.');
          }
          newStock -= formData.quantity;
        } else if (formData.type === 'adjust') {
          // Adjust means setting the stock to the exact quantity provided
          // Wait, the prompt says "Ajuste". Usually adjust means setting the absolute value or adding/subtracting.
          // Let's treat adjust as setting the new absolute stock value.
          // The difference is what we record in the movement.
          const diff = formData.quantity - currentStock;
          if (diff === 0) throw new Error('A quantidade de ajuste é igual ao estoque atual.');
          newStock = formData.quantity;
          
          // We will record the absolute value in the movement, but maybe we should record the difference?
          // Let's just record the quantity as the new absolute value for 'adjust'.
        }

        // Update product stock
        transaction.update(productRef, { 
          stock: newStock,
          updatedAt: serverTimestamp()
        });

        // Create movement record
        transaction.set(movementRef, {
          productId: formData.productId,
          productName: productDoc.data().name,
          type: formData.type,
          quantity: formData.type === 'adjust' ? Math.abs(formData.quantity - currentStock) : formData.quantity,
          reason: formData.reason || (formData.type === 'adjust' ? 'Ajuste de inventário' : ''),
          userEmail: user?.email,
          userName: user?.name,
          date: new Date().toISOString(), // Using ISO string for easier parsing in charts
          notes: formData.notes
        });
      });

      setSuccess('Movimentação registrada com sucesso!');
      setFormData({ ...formData, quantity: 1, reason: '', notes: '' });
      
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      setError(err.message || 'Erro ao registrar movimentação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Registrar Movimentação</h2>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#141414] border border-yellow-500/10 rounded-2xl p-8 shadow-xl"
      >
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">✓</div>
            <p className="text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection */}
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'in' })}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                formData.type === 'in' 
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                  : 'bg-[#0A0A0A] border-white/5 text-gray-400 hover:border-white/10'
              }`}
            >
              <ArrowDownToLine className="w-6 h-6" />
              <span className="font-medium">Entrada</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'out' })}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                formData.type === 'out' 
                  ? 'bg-red-500/10 border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                  : 'bg-[#0A0A0A] border-white/5 text-gray-400 hover:border-white/10'
              }`}
            >
              <ArrowUpFromLine className="w-6 h-6" />
              <span className="font-medium">Saída</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'adjust' })}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                formData.type === 'adjust' 
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                  : 'bg-[#0A0A0A] border-white/5 text-gray-400 hover:border-white/10'
              }`}
            >
              <ArrowRightLeft className="w-6 h-6" />
              <span className="font-medium">Ajuste</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Produto *</label>
            <select
              required
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 appearance-none"
            >
              <option value="">Selecione um produto...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (SKU: {p.sku}) - Estoque: {p.stock}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">
                {formData.type === 'adjust' ? 'Novo Estoque Total *' : 'Quantidade *'}
              </label>
              <input
                required
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Motivo</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Ex: Compra, Venda, Perda..."
                className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Observações</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 resize-none"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar Movimentação'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
