import { Order, Expense, Product, ProductRequest } from '@/types';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Package, DollarSign, Wallet, ShoppingBag, BarChart3, PieChart as PieIcon, Trophy, Crown, Star } from 'lucide-react';

interface Props {
  orders: Order[];
  expenses: Expense[];
  products: Product[];
  requests: ProductRequest[];
}

export function MonthlySummary({ orders, expenses, products, requests }: Props) {
  const inventoryStats = useMemo(() => {
    const totalItems = products.length;
    const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
    const totalStockValue = products.reduce((s, p) => s + ((p.stock || 0) * (p.price || 0)), 0);
    return { totalItems, totalStock, totalStockValue };
  }, [products]);

  const highlights = useMemo(() => {
    // 🏆 Top 3 Best Sellers (Actual Sales)
    const productSalesMap: Record<string, number> = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        const pName = item.productName || 'Unknown';
        productSalesMap[pName] = (productSalesMap[pName] || 0) + item.quantity;
      });
    });
    const topSellers = Object.entries(productSalesMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // 🌟 Top 3 Most Requested
    const requestMap: Record<string, number> = {};
    requests.forEach(r => {
      const pName = r.product_name || 'Unknown';
      requestMap[pName] = (requestMap[pName] || 0) + 1;
    });
    const topRequested = Object.entries(requestMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return { topSellers, topRequested };
  }, [orders, requests]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { orders: Order[]; expenses: Expense[] }> = {};
    
    orders.forEach(o => {
      const d = new Date(o.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { orders: [], expenses: [] };
      months[key].orders.push(o);
    });
    
    expenses.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { orders: [], expenses: [] };
      months[key].expenses.push(e);
    });

    return Object.entries(months)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
        
        const totalIncome = data.orders.reduce((s, o) => s + o.total, 0);
        const totalPaid = data.orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.total, 0);
        const totalExpenses = data.expenses.reduce((s, e) => s + e.amount, 0);
        const profit = totalPaid - totalExpenses;

        // Product Sales data for Bar Chart
        const productSalesMap: Record<string, number> = {};
        data.orders.forEach(o => {
          o.items.forEach(item => {
            const pName = item.productName || 'Unknown Product';
            productSalesMap[pName] = (productSalesMap[pName] || 0) + item.quantity;
          });
        });

        const chartData = Object.entries(productSalesMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8); // Top 8 products

        return { 
          key, 
          monthName, 
          totalIncome, 
          totalPaid, 
          totalExpenses, 
          profit,
          chartData,
          orderCount: data.orders.length 
        };
      });
  }, [orders, expenses]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Inventory Quick Overview ────────────────────────────── */}
      <div className="flex justify-center">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-pink-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center">
              <Package className="w-6 h-6 text-pink-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Global Inventory</p>
              <h3 className="text-3xl font-display font-bold text-zinc-900 dark:text-zinc-100">{inventoryStats.totalItems} <span className="text-sm font-normal text-zinc-400 font-sans">Unique Products</span></h3>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hall of Fame (Top 3 Sections) ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Sellers */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-3xl p-6 border border-amber-100 dark:border-amber-900/40 relative overflow-hidden group shadow-sm">
           <Trophy className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-500/10 rotate-12 group-hover:scale-110 transition-transform" />
           <div className="relative">
              <div className="flex items-center gap-2 mb-6">
                 <Crown className="w-5 h-5 text-amber-600" />
                 <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-widest">Monthly Best Sellers</h3>
              </div>
              <div className="space-y-3">
                 {highlights.topSellers.length > 0 ? highlights.topSellers.map((s, idx) => (
                    <div key={s.name} className="flex items-center gap-3 bg-white/60 dark:bg-black/20 backdrop-blur-sm p-3 rounded-2xl border border-amber-200/50 dark:border-amber-800/30">
                       <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-amber-400 text-white shadow-lg' : idx === 1 ? 'bg-zinc-400 text-white' : 'bg-orange-400 text-white'}`}>
                          {idx + 1}
                       </span>
                       <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex-1 truncate">{s.name}</span>
                       <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{s.count} Sold</span>
                    </div>
                 )) : <p className="text-xs text-amber-600/60 font-medium text-center py-4 italic">No top sellers yet</p>}
              </div>
           </div>
        </div>

        {/* Top Requested */}
        <div className="bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/20 dark:to-indigo-950/20 rounded-3xl p-6 border border-sky-100 dark:border-sky-900/40 relative overflow-hidden group shadow-sm">
           <Star className="absolute -right-4 -bottom-4 w-24 h-24 text-sky-500/10 rotate-12 group-hover:scale-110 transition-transform" />
           <div className="relative">
              <div className="flex items-center gap-2 mb-6">
                 <Star className="w-5 h-5 text-sky-600" />
                 <h3 className="text-sm font-bold text-sky-900 dark:text-sky-200 uppercase tracking-widest">In-Demand Requests</h3>
              </div>
              <div className="space-y-3">
                 {highlights.topRequested.length > 0 ? highlights.topRequested.map((r, idx) => (
                    <div key={r.name} className="flex items-center gap-3 bg-white/60 dark:bg-black/20 backdrop-blur-sm p-3 rounded-2xl border border-sky-200/50 dark:border-sky-800/30">
                       <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-sky-400 text-white shadow-lg' : idx === 1 ? 'bg-zinc-400 text-white' : 'bg-indigo-400 text-white'}`}>
                          {idx + 1}
                       </span>
                       <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex-1 truncate">{r.name}</span>
                       <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{r.count} Wish</span>
                    </div>
                 )) : <p className="text-xs text-sky-600/60 font-medium text-center py-4 italic">No requests recorded yet</p>}
              </div>
           </div>
        </div>
      </div>

      {/* ── Monthly Records ────────────────────────────────────── */}
      {monthlyData.length === 0 ? (
        <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
           <BarChart3 className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
           <p className="text-zinc-500 font-medium">No sales data recorded yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {monthlyData.map(m => (
            <div key={m.key} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-200 dark:to-zinc-800"></div>
                <h2 className="font-display text-xl font-bold text-zinc-800 dark:text-zinc-200 px-4">{m.monthName}</h2>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-200 dark:to-zinc-800"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Metrics Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Wallet className="w-4 h-4 text-pink-500" />
                           <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Monthly Income</span>
                        </div>
                        <span className="text-2xl font-display font-bold text-zinc-800 dark:text-zinc-100">{m.totalIncome.toLocaleString()} <span className="text-xs font-normal text-zinc-400">lei</span></span>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <ShoppingBag className="w-4 h-4 text-sky-500" />
                           <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Expenses Total</span>
                        </div>
                        <span className="text-2xl font-display font-bold text-red-500">- {m.totalExpenses.toLocaleString()} <span className="text-xs font-normal text-zinc-400">lei</span></span>
                     </div>
                     <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">Net Profit</span>
                        <span className={`text-3xl font-display font-bold ${m.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                           {m.profit.toLocaleString()} <span className="text-sm font-normal opacity-60">lei</span>
                        </span>
                     </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 text-center">
                       <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Total Orders</p>
                       <p className="text-xl font-display font-bold text-zinc-700 dark:text-zinc-200">{m.orderCount}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl p-4 text-center">
                       <p className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase mb-1">Paid In Full</p>
                       <p className="text-xl font-display font-bold text-emerald-600 dark:text-emerald-400">{m.totalPaid.toLocaleString()} lei</p>
                    </div>
                  </div>
                </div>

                {/* Sales Chart Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-8 shadow-sm overflow-hidden flex flex-col">
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-2">
                         <BarChart3 className="w-4 h-4 text-amber-500" />
                         <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Product Sales Overview</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-zinc-50 dark:bg-zinc-800 text-zinc-400">UNIT SALES</span>
                   </div>
                   
                   <div className="h-[320px] w-full mt-auto">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={m.chartData} layout="vertical" margin={{ left: 20, right: 40, top: 0, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={120} 
                            axisLine={false} 
                            tickLine={false}
                            tick={{ fontSize: 12, fontWeight: 700, fill: '#666' }}
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 8 }}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                          />
                          <Bar 
                            dataKey="count" 
                            radius={[0, 10, 10, 0]} 
                            barSize={32}
                            label={{ position: 'right', fill: '#999', fontSize: 12, fontWeight: 700, offset: 10 }}
                          >
                            {m.chartData.map((_, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={index % 2 === 0 ? '#ec4899' : '#f59e0b'} 
                                fillOpacity={0.9}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
