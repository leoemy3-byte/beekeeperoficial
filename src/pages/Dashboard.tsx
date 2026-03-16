import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { format, subDays, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStock: 0,
    entriesMonth: 0,
    exitsMonth: 0,
  });
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Listen to Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      let totalProd = 0;
      let totalStk = 0;
      let lowStk = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        totalProd++;
        totalStk += data.stock || 0;
        if (data.stock <= data.minStock) lowStk++;
      });

      setStats(s => ({ ...s, totalProducts: totalProd, totalStock: totalStk, lowStock: lowStk }));
    });

    // Listen to Movements
    const q = query(collection(db, 'movements'), orderBy('date', 'desc'), limit(100));
    const unsubMovements = onSnapshot(q, (snapshot) => {
      let entries = 0;
      let exits = 0;
      const now = new Date();
      
      // For chart data (last 7 days)
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(now, 6 - i);
        return {
          date: format(d, 'dd/MM'),
          rawDate: format(d, 'yyyy-MM-dd'),
          entradas: 0,
          saidas: 0
        };
      });

      const recent: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.date) return;
        
        const date = typeof data.date === 'string' ? parseISO(data.date) : data.date.toDate();
        
        if (recent.length < 5) recent.push({ id: doc.id, ...data });

        if (isSameMonth(date, now)) {
          if (data.type === 'in') entries += data.quantity;
          if (data.type === 'out') exits += data.quantity;
        }

        // Aggregate for chart
        const dayStr = format(date, 'yyyy-MM-dd');
        const dayData = last7Days.find(d => d.rawDate === dayStr);
        if (dayData) {
          if (data.type === 'in') dayData.entradas += data.quantity;
          if (data.type === 'out') dayData.saidas += data.quantity;
        }
      });

      setStats(s => ({ ...s, entriesMonth: entries, exitsMonth: exits }));
      setRecentMovements(recent);
      setChartData(last7Days);
    });

    return () => {
      unsubProducts();
      unsubMovements();
    };
  }, []);

  const statCards = [
    { title: 'Total de Produtos', value: stats.totalProducts, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10', link: '/products' },
    { title: 'Estoque Total', value: stats.totalStock, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', link: '/products' },
    { title: 'Estoque Baixo', value: stats.lowStock, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', link: '/products' },
    { title: 'Entradas (Mês)', value: stats.entriesMonth, icon: ArrowDownToLine, color: 'text-yellow-500', bg: 'bg-yellow-500/10', link: '/history' },
    { title: 'Saídas (Mês)', value: stats.exitsMonth, icon: ArrowUpFromLine, color: 'text-orange-500', bg: 'bg-orange-500/10', link: '/history' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Visão Geral</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <div 
            key={i} 
            onClick={() => navigate(stat.link)}
            className="bg-[#141414] border border-yellow-500/10 rounded-2xl p-6 flex items-center gap-4 hover:border-yellow-500/50 hover:bg-white/5 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className={`p-4 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">{stat.title}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-[#141414] border border-yellow-500/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Movimentações (Últimos 7 dias)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="date" stroke="#666" tick={{ fill: '#888' }} />
                <YAxis stroke="#666" tick={{ fill: '#888' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', color: '#fff' }}
                  itemStyle={{ color: '#EAB308' }}
                />
                <Legend />
                <Area type="monotone" name="Entradas" dataKey="entradas" stroke="#EAB308" fillOpacity={1} fill="url(#colorIn)" />
                <Area type="monotone" name="Saídas" dataKey="saidas" stroke="#EF4444" fillOpacity={1} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#141414] border border-yellow-500/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Atividade Recente</h3>
          <div className="space-y-4">
            {recentMovements.map((mov) => (
              <div key={mov.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className={`p-2 rounded-lg ${
                  mov.type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 
                  mov.type === 'out' ? 'bg-red-500/10 text-red-500' : 
                  'bg-blue-500/10 text-blue-500'
                }`}>
                  {mov.type === 'in' ? <ArrowDownToLine className="w-4 h-4" /> : 
                   mov.type === 'out' ? <ArrowUpFromLine className="w-4 h-4" /> : 
                   <ArrowRightLeft className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{mov.productName}</p>
                  <p className="text-xs text-gray-400 truncate">{mov.userName}</p>
                </div>
                <div className={`text-sm font-bold ${
                  mov.type === 'in' ? 'text-emerald-500' : 
                  mov.type === 'out' ? 'text-red-500' : 
                  'text-blue-500'
                }`}>
                  {mov.type === 'in' ? '+' : mov.type === 'out' ? '-' : ''}{mov.quantity}
                </div>
              </div>
            ))}
            {recentMovements.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">Nenhuma movimentação recente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
