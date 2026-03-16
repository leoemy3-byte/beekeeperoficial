import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Shield, ShieldAlert, Trash2, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', role: 'operator' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usrs: any[] = [];
      snapshot.forEach(doc => usrs.push({ id: doc.id, ...doc.data() }));
      setUsers(usrs);
    });
    return () => unsub();
  }, []);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!editingUser) return;
    
    if (!formData.name.trim()) {
      setError('O nome não pode estar vazio.');
      return;
    }

    // Prevent removing the last admin
    if (editingUser.role === 'admin' && formData.role === 'operator') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        setError('Não é possível alterar o papel do único administrador do sistema.');
        return;
      }
    }

    try {
      await updateDoc(doc(db, 'users', editingUser.id), { 
        name: formData.name.trim(),
        role: formData.role 
      });
      closeModal();
    } catch (err) {
      console.error(err);
      setError('Erro ao atualizar usuário.');
    }
  };

  const handleDeleteClick = (id: string, role: string) => {
    setError('');
    if (id === user?.uid) {
      setError('Você não pode excluir a si mesmo.');
      return;
    }
    if (role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        setError('Não é possível excluir o único administrador do sistema.');
        return;
      }
    }
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'users', deleteConfirm));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      setError('Erro ao excluir usuário.');
    }
  };

  const openModal = (u: any) => {
    setEditingUser(u);
    setFormData({ name: u.name, role: u.role });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Gerenciamento de Usuários</h2>
        <p className="text-sm text-gray-400">
          Novos usuários são adicionados automaticamente ao fazerem login com Google pela primeira vez.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
          <ShieldAlert className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="bg-[#141414] border border-yellow-500/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-yellow-500/10 text-gray-400 text-sm">
                <th className="p-4 font-medium">Nome</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Nível de Acesso</th>
                <th className="p-4 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-yellow-500/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 text-white font-medium">{u.name}</td>
                  <td className="p-4 text-gray-400">{u.email}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                      u.role === 'admin' 
                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                      {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                      {u.role === 'admin' ? 'Administrador' : 'Operador'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(u)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteClick(u.id, u.role)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141414] border border-yellow-500/20 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-yellow-500/10 flex justify-between items-center bg-white/5">
                <h3 className="text-xl font-bold text-white">Editar Usuário</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-400 mb-6">
                  Editando informações de <strong className="text-white">{editingUser?.email}</strong>.
                </p>

                <form id="userForm" onSubmit={handleUpdateUser} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Nome Completo</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50"
                      placeholder="Nome do usuário"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Nível de Acesso</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full bg-[#0A0A0A] border border-yellow-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 appearance-none"
                    >
                      <option value="operator">Operador (Apenas produtos e movimentações)</option>
                      <option value="admin">Administrador (Acesso total)</option>
                    </select>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-yellow-500/10 bg-white/5 flex justify-end gap-4">
                <button onClick={closeModal} className="px-6 py-2.5 rounded-xl text-gray-400 font-medium hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="userForm" className="px-6 py-2.5 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                  Salvar Alterações
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
                  <ShieldAlert className="w-6 h-6" />
                  Remover Acesso
                </h3>
              </div>
              <div className="p-6">
                <p className="text-gray-300">
                  Tem certeza que deseja remover o acesso deste usuário? Ele não poderá mais entrar no sistema.
                </p>
              </div>
              <div className="p-6 border-t border-red-500/10 bg-white/5 flex justify-end gap-4">
                <button onClick={() => setDeleteConfirm(null)} className="px-6 py-2.5 rounded-xl text-gray-400 font-medium hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmDelete} className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  Sim, Remover
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
