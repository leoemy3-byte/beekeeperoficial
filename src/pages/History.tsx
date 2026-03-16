import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft } from 'lucide-react';

export default function History() {
  const [movements, setMovements] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'movements'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const movs: any[] = [];
      snapshot.forEach(doc => movs.push({ id: doc.id, ...doc.data() }));
      setMovements(movs);
    });
    return () => unsub();
  }, []);

  const filteredMovements = movements.filter(m => 
    m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Histórico de Movimentações</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por produto, usuário ou motivo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#141414] border border-yellow-500/20 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
        />
      </div>

      <div className="bg-[#141414] border border-yellow-500/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-yellow-500/10 text-gray-400 text-sm">
                <th className="p-4 font-medium">Data/Hora</th>
                <th className="p-4 font-medium">Produto</th>
                <th className="p-4 font-medium">Tipo</th>
                <th className="p-4 font-medium text-right">Qtd</th>
                <th className="p-4 font-medium">Motivo</th>
                <th className="p-4 font-medium">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-yellow-500/5">
              {filteredMovements.map((mov) => (
                <tr key={mov.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-gray-400 text-sm">
                    {format(typeof mov.date === 'string' ? parseISO(mov.date) : mov.date.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </td>
                  <td className="p-4 text-white font-medium">{mov.productName}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                      mov.type === 'in' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                      mov.type === 'out' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                      {mov.type === 'in' ? <ArrowDownToLine className="w-3 h-3" /> : 
                       mov.type === 'out' ? <ArrowUpFromLine className="w-3 h-3" /> : 
                       <ArrowRightLeft className="w-3 h-3" />}
                      {mov.type === 'in' ? 'Entrada' : mov.type === 'out' ? 'Saída' : 'Ajuste'}
                    </span>
                  </td>
                  <td className={`p-4 text-right font-bold ${
                    mov.type === 'in' ? 'text-emerald-500' : 
                    mov.type === 'out' ? 'text-red-500' : 
                    'text-blue-500'
                  }`}>
                    {mov.type === 'in' ? '+' : mov.type === 'out' ? '-' : ''}{mov.quantity}
                  </td>
                  <td className="p-4 text-gray-400 text-sm">{mov.reason || '-'}</td>
                  <td className="p-4 text-gray-400 text-sm">{mov.userName}</td>
                </tr>
              ))}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Nenhuma movimentação encontrada no histórico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
