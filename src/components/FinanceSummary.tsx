import { useState, useMemo } from 'react';
import { useMonthlySummaries, useOrders, useExpenses } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, Save, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
// import { useExpenseStore } from '@/lib/expenseStore'; // REMOVED: does not exist

export function FinanceSummary() {
  const { summaries, loading, saveSnapshot } = useMonthlySummaries();
  const { orders } = useOrders();
  const { expenses } = useExpenses();

  const [notes, setNotes] = useState('');

  // ── Calculate Current Month Metrics ──
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const currentMonthData = useMemo(() => {
    const monthOrders = orders.filter(o => {
      const d = new Date(o.date);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });

    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });

    const total_revenue = monthOrders.reduce((sum, o) => sum + o.total, 0);
    const total_expenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const net_profit = total_revenue - total_expenses;

    const paid_orders = monthOrders.filter(o => o.status === 'paid').length;
    const unpaid_orders = monthOrders.filter(o => o.status === 'unpaid').length;

    return {
      month: currentMonth,
      year: currentYear,
      total_revenue,
      total_expenses,
      net_profit,
      total_orders: monthOrders.length,
      paid_orders,
      unpaid_orders,
    };
  }, [orders, expenses, currentMonth, currentYear]);

  const handleSaveMonth = async () => {
    await saveSnapshot({ ...currentMonthData, notes });
    setNotes('');
  };

  const formatMonth = (m: number, y: number) => {
    const d = new Date();
    d.setMonth(m - 1);
    d.setFullYear(y);
    return d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      
      {/* ── Save Current Month Snapshot ── */}
      <div className="bakery-card rounded-2xl p-6 bg-gradient-to-br from-pink-50 to-white dark:from-zinc-900 dark:to-zinc-950 border border-pink-100 dark:border-pink-900/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl pink-text flex items-center gap-2">
            <Calculator className="w-6 h-6" /> Snapshot: {formatMonth(currentMonth, currentYear)}
          </h2>
          <Button onClick={handleSaveMonth} className="pink-gradient gap-2 shadow-md">
            <Save className="w-4 h-4" /> Save Monthly Snapshot
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Gross Revenue</p>
            <p className="text-2xl font-black text-green-600">{Number(currentMonthData.total_revenue).toLocaleString()} lei</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Expenses</p>
            <p className="text-2xl font-black text-rose-600">{Number(currentMonthData.total_expenses).toLocaleString()} lei</p>
          </div>
           <div className={`p-4 rounded-xl shadow-sm border ${currentMonthData.net_profit >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${currentMonthData.net_profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-rose-700 dark:text-rose-400'}`}>Net Profit</p>
            <p className={`text-2xl font-black flex items-center gap-1 ${currentMonthData.net_profit >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
              {currentMonthData.net_profit >= 0 ? <TrendingUp className="w-5 h-5"/> : <TrendingDown className="w-5 h-5"/>}
              {Number(Math.abs(currentMonthData.net_profit)).toLocaleString()} lei
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Orders</p>
            <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{currentMonthData.total_orders}</p>
            <p className="text-xs text-zinc-400 font-medium mt-1">{currentMonthData.paid_orders} paid · {currentMonthData.unpaid_orders} unpaid</p>
          </div>
        </div>

        <Input 
          placeholder="Optional notes for this month (e.g. 'Valentine's promo boom')"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="bg-white dark:bg-zinc-900 border-zinc-200"
        />
      </div>

      {/* ── Monthly Archives ── */}
      <div className="bakery-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-zinc-800 dark:text-zinc-100 mb-6 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-emerald-500" /> Historical Summaries
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-500">
                <th className="p-3">Month</th>
                <th className="p-3 text-right">Revenue</th>
                <th className="p-3 text-right">Expenses</th>
                <th className="p-3 text-right">Net Profit</th>
                <th className="p-3 text-center">Orders</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={6} className="text-center p-8 text-zinc-400">Loading summaries...</td></tr>
              ) : summaries.length === 0 ? (
                 <tr><td colSpan={6} className="text-center p-8 text-zinc-400">No historical summaries saved yet. Save a snapshot above!</td></tr>
              ) : (
                summaries.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="p-3 font-medium text-zinc-800 dark:text-zinc-100 whitespace-nowrap">
                      {formatMonth(s.month, s.year)}
                    </td>
                    <td className="p-3 text-right text-green-600 font-semibold">{s.total_revenue.toLocaleString()} lei</td>
                    <td className="p-3 text-right text-rose-600 font-semibold">{s.total_expenses.toLocaleString()} lei</td>
                    <td className="p-3 text-right font-black">
                      <span className={s.net_profit >= 0 ? 'text-green-600' : 'text-rose-600'}>
                        {s.net_profit >= 0 ? '+' : '-'}{Math.abs(s.net_profit).toLocaleString()} lei
                      </span>
                    </td>
                    <td className="p-3 text-center text-zinc-600 dark:text-zinc-400 font-medium">
                      {s.total_orders} <span className="text-xs block text-zinc-400">({s.paid_orders}P/{s.unpaid_orders}U)</span>
                    </td>
                    <td className="p-3 text-sm text-zinc-500 max-w-xs truncate" title={s.notes}>
                      {s.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
