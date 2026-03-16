import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Download, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const exportToExcel = async (collectionName: string, fileName: string) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const data: any[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      if (data.length === 0) {
        setError(`Nenhum dado encontrado em ${collectionName}.`);
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
      XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      setSuccess(`Exportação de ${fileName} concluída com sucesso!`);
    } catch (err) {
      console.error(err);
      setError('Erro ao exportar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportProducts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (user?.role !== 'admin') {
      setError('Apenas administradores podem importar produtos.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let importedCount = 0;

        for (const row of data as any[]) {
          // Validate required fields based on our blueprint
          if (row.name && row.sku && row.stock !== undefined && row.minStock !== undefined) {
            await addDoc(collection(db, 'products'), {
              name: String(row.name),
              sku: String(row.sku),
              category: String(row.category || ''),
              supplier: String(row.supplier || ''),
              cost: Number(row.cost || 0),
              price: Number(row.price || 0),
              stock: Number(row.stock),
              minStock: Number(row.minStock),
              location: String(row.location || ''),
              barcode: String(row.barcode || ''),
              notes: String(row.notes || ''),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            importedCount++;
          }
        }

        setSuccess(`${importedCount} produtos importados com sucesso!`);
      } catch (err) {
        console.error(err);
        setError('Erro ao processar arquivo. Verifique o formato das colunas.');
      } finally {
        setLoading(false);
        // Reset file input
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Relatórios e Backup</h2>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">✓</div>
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141414] border border-yellow-500/10 rounded-2xl p-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Exportar Dados</h3>
              <p className="text-sm text-gray-400">Baixe relatórios completos em formato Excel (.xlsx)</p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => exportToExcel('products', 'Estoque_Atual')}
              disabled={loading}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-white/5 bg-[#0A0A0A] hover:bg-white/5 hover:border-yellow-500/30 transition-all text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                <span className="font-medium text-gray-200">Relatório de Estoque Atual</span>
              </div>
              <Download className="w-4 h-4 text-gray-500" />
            </button>

            <button
              onClick={() => exportToExcel('movements', 'Historico_Movimentacoes')}
              disabled={loading}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-white/5 bg-[#0A0A0A] hover:bg-white/5 hover:border-yellow-500/30 transition-all text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-gray-200">Histórico de Movimentações</span>
              </div>
              <Download className="w-4 h-4 text-gray-500" />
            </button>
            
            {user?.role === 'admin' && (
              <button
                onClick={() => exportToExcel('users', 'Usuarios_Sistema')}
                disabled={loading}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-white/5 bg-[#0A0A0A] hover:bg-white/5 hover:border-yellow-500/30 transition-all text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                  <span className="font-medium text-gray-200">Lista de Usuários</span>
                </div>
                <Download className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Import Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#141414] border border-yellow-500/10 rounded-2xl p-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Importar Produtos</h3>
              <p className="text-sm text-gray-400">Cadastre produtos em massa via planilha</p>
            </div>
          </div>

          <div className="p-6 border-2 border-dashed border-yellow-500/20 rounded-xl bg-[#0A0A0A] text-center relative hover:border-yellow-500/50 transition-colors group">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleImportProducts}
              disabled={loading || user?.role !== 'admin'}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <Upload className="w-8 h-8 text-yellow-500/50 mx-auto mb-3 group-hover:text-yellow-500 transition-colors" />
            <p className="text-sm font-medium text-gray-300 mb-1">
              Clique ou arraste uma planilha aqui
            </p>
            <p className="text-xs text-gray-500">
              Formatos suportados: .xlsx, .csv
            </p>
            
            {user?.role !== 'admin' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-bold border border-red-500/30">
                  Apenas Administradores
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/5">
            <h4 className="text-sm font-bold text-gray-300 mb-2">Formato exigido da planilha:</h4>
            <p className="text-xs text-gray-400 mb-3">A primeira linha deve conter os cabeçalhos exatos:</p>
            <div className="flex flex-wrap gap-2">
              {['name', 'sku', 'stock', 'minStock'].map(col => (
                <span key={col} className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs font-mono border border-yellow-500/20">
                  {col}*
                </span>
              ))}
              {['category', 'supplier', 'cost', 'price', 'location', 'barcode', 'notes'].map(col => (
                <span key={col} className="px-2 py-1 bg-white/5 text-gray-400 rounded text-xs font-mono border border-white/10">
                  {col}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
