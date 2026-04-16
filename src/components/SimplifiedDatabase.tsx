import React, { useMemo } from 'react';
import { Order } from '@/types';
import { Calendar, Package, Check, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
  orders: Order[];
  toggleStatus: (id: string) => void;
}

export function SimplifiedDatabase({ orders, toggleStatus }: Props) {
  const [collapsedMonths, setCollapsedMonths] = React.useState<Record<string, boolean>>({});

  const groupedOrdersData = useMemo(() => {
    const groups: Record<string, { total: number; unpaid: number; customers: Record<string, Order[]> }> = {};

    orders.forEach(order => {
      try {
        if (!order || !order.date) return;
        const date = new Date(order.date);
        if (isNaN(date.getTime())) return;

        const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        const rawName = order.customerName || 'Valued Customer';
        const customerKey = rawName.startsWith('@') ? rawName.slice(1) : rawName;

        if (!groups[monthKey]) groups[monthKey] = { total: 0, unpaid: 0, customers: {} };
        if (!groups[monthKey].customers[customerKey]) groups[monthKey].customers[customerKey] = [];

        const orderTotal = Number(order.total) || 0;
        groups[monthKey].customers[customerKey].push(order);
        groups[monthKey].total += orderTotal;
        if (order.status === 'unpaid') groups[monthKey].unpaid += 1;
      } catch {
        // Skip malformed orders
      }
    });

    // Sort customers alphabetically within each month
    Object.keys(groups).forEach(month => {
      const sortedCustomers: Record<string, Order[]> = {};
      Object.keys(groups[month].customers)
        .sort((a, b) => a.localeCompare(b))
        .forEach(name => {
          sortedCustomers[name] = [...groups[month].customers[name]].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        });
      groups[month].customers = sortedCustomers;
    });

    return Object.entries(groups).sort((a, b) => {
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
    });
  }, [orders]);

  const toggleMonth = (month: string) => {
    setCollapsedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  const formatCurrency = (num: number) => {
    const n = Number(num);
    if (isNaN(n)) return '₱ 0';
    if (n > 1e6) return '₱ ' + (n / 1e6).toFixed(1) + 'M';
    return '₱ ' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="bakery-card rounded-2xl p-12 text-center text-muted-foreground animate-fade-in border-dashed border-2">
        <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-pink-500" />
        </div>
        <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">No orders recorded yet. Start baking! 🧁</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-20">
      {groupedOrdersData.map(([month, data]) => (
        <div key={month} className="space-y-4">
          <button
            onClick={() => toggleMonth(month)}
            className="w-full flex items-center justify-between group py-2"
          >
            <div className="flex items-center gap-4 text-left">
              <div className={`p-2.5 rounded-2xl transition-all shadow-sm ${collapsedMonths[month] ? 'bg-white dark:bg-zinc-800' : 'bg-pink-500 text-white shadow-pink-200'}`}>
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-xl sm:text-2xl pink-text flex items-center gap-2">
                  {month}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">
                    {Object.keys(data.customers).length} Customers
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-[10px] font-black text-pink-600 uppercase tracking-[0.15em]">
                    {formatCurrency(data.total)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {data.unpaid > 0 && (
                <div
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full shadow-lg border border-red-700"
                  style={{ backgroundColor: '#dc2626', color: 'white' }}
                >
                  <span className="text-[10px] font-black tracking-tight">{data.unpaid} PENDING</span>
                </div>
              )}
              {collapsedMonths[month]
                ? <ChevronRight className="w-5 h-5 text-zinc-400" />
                : <ChevronDown className="w-5 h-5 text-pink-500" />}
            </div>
          </button>

          {!collapsedMonths[month] && (
            <div className="grid gap-6 animate-in fade-in slide-in-from-top-4 duration-300 px-1">
              {Object.entries(data.customers).map(([name, customerOrders]) => {
                const unpaidCount = customerOrders.filter(o => o.status === 'unpaid').length;
                const customerTotal = customerOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

                return (
                  <div key={name} className="bakery-card bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shadow-xl overflow-hidden rounded-[2.5rem]">
                    {/* Customer Header */}
                    <div className="p-6 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-100 dark:border-zinc-700">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-display text-2xl shadow-xl shadow-pink-200/50 dark:shadow-none">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-display text-lg text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">{customerOrders[0].customerName}</h3>
                          {customerOrders[0].username && (
                            <p className="text-[11px] text-pink-600 dark:text-pink-400 font-bold mb-1">@{customerOrders[0].username}</p>
                          )}
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest">
                               {customerOrders.length} Orders
                             </span>
                             <span className="text-zinc-300 dark:text-zinc-600">·</span>
                             <span className="text-[10px] text-zinc-400 dark:text-zinc-400 font-bold uppercase tracking-widest">
                               {formatCurrency(customerTotal)}
                             </span>
                          </div>
                        </div>
                      </div>
                      {unpaidCount > 0 ? (
                        <div
                          className="px-4 py-2 rounded-lg shadow-lg animate-pulse border border-red-700"
                          style={{ backgroundColor: '#dc2626', color: 'white' }}
                        >
                          <span className="text-[10px] font-black tracking-widest">{unpaidCount} UNPAID</span>
                        </div>
                      ) : (
                        <div
                          className="px-4 py-2 rounded-lg shadow-md border border-green-700"
                          style={{ backgroundColor: '#16a34a', color: 'white' }}
                        >
                          <span className="text-[10px] font-black tracking-widest flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" /> PAID ALL
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Orders List */}
                    <div className="p-3 space-y-2 bg-white dark:bg-zinc-900/50">
                      {customerOrders.map(order => (
                        <div
                          key={order.id}
                          className="p-4 rounded-[1.5rem] flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-600"
                        >
                          <div className="flex items-center gap-6 min-w-0 flex-1">
                            <div className="hidden sm:block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest w-24">
                              {new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-base font-black text-zinc-900 dark:text-zinc-50 mb-0.5">
                                {formatCurrency(Number(order.total))}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate font-semibold">
                                {(order.items && Array.isArray(order.items) && order.items.length > 0)
                                  ? order.items.map(i => `${i.productName} ×${i.quantity}`).join(', ')
                                  : 'Special Order'}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => toggleStatus(order.id)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all transform active:scale-95 border ${
                              order.status === 'paid'
                                ? 'text-white border-green-600'
                                : 'bg-amber-600 text-white shadow-xl shadow-amber-200/50 dark:shadow-none hover:bg-amber-500 border-none'
                            }`}
                            style={order.status === 'paid' ? { backgroundColor: '#22c55e' } : undefined}
                          >
                            {order.status === 'paid' ? 'PAID' : 'UNPAID'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
