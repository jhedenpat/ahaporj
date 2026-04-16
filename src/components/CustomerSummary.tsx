import { Order } from '@/types';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  orders: Order[];
  toggleStatus: (id: string) => void;
  removeOrder: (id: string) => void;
}

export function CustomerSummary({ orders, toggleStatus, removeOrder }: Props) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const monthlyData = useMemo(() => {
    const months: Record<string, { monthName: string; totalUnpaid: number; customers: Record<string, { totalSpent: number; orderCount: number; lastOrder: string; unpaid: number; orders: Order[] }> }> = {};

    orders.forEach(o => {
        const d = new Date(o.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        if (!months[key]) {
            const monthName = new Date(d.getFullYear(), d.getMonth()).toLocaleString('default', { month: 'long', year: 'numeric' });
            months[key] = { monthName, totalUnpaid: 0, customers: {} };
        }
        
        const name = o.customerName.startsWith('@') ? o.customerName.slice(1).toLowerCase() : o.customerName.toLowerCase();
        if (!months[key].customers[name]) {
             months[key].customers[name] = { totalSpent: 0, orderCount: 0, lastOrder: o.date, unpaid: 0, orders: [] };
        }
        
        months[key].customers[name].totalSpent += o.total;
        months[key].customers[name].orderCount += 1;
        months[key].customers[name].orders.push(o);
        if (o.status === 'unpaid') {
           months[key].customers[name].unpaid += o.total;
           months[key].totalUnpaid += o.total;
        }
        if (new Date(o.date) > new Date(months[key].customers[name].lastOrder)) {
            months[key].customers[name].lastOrder = o.date;
        }
    });

    // Sort orders within each customer by date descending
    Object.values(months).forEach(m => {
        Object.values(m.customers).forEach(c => {
             c.orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
    });

    // Sort months descending, then sort customers within months by totalSpent descending
    return Object.entries(months)
       .sort(([a], [b]) => b.localeCompare(a))
       .map(([key, data]) => {
           const sortedCustomers = Object.entries(data.customers).sort(([, a], [, b]) => b.totalSpent - a.totalSpent);
           return { ...data, key, sortedCustomers };
       });
  }, [orders]);

  return (
    <div className="bakery-card rounded-2xl p-4 md:p-6 animate-fade-in">
      <h2 className="font-display text-xl md:text-2xl pink-text mb-4 flex items-center gap-2">
        <span>👥</span> Customers
      </h2>
      {monthlyData.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No customers yet 🌸</p>
      ) : (
        <div className="space-y-4">
          {monthlyData.map(m => (
            <div key={m.key} className="bg-accent/30 border border-border rounded-xl overflow-hidden transition-colors">
              <button
                onClick={() => setExpandedMonth(expandedMonth === m.key ? null : m.key)}
                className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors text-left bg-card/60"
              >
                <div className="flex items-center gap-3">
                   <h3 className="font-bold text-lg text-foreground capitalize">{m.monthName}</h3>
                </div>
                <div className="flex items-center gap-4">
                  {m.totalUnpaid > 0 && (
                    <span className="text-destructive font-bold text-sm bg-destructive/10 px-2 py-1 rounded-md">
                      Unpaid: {m.totalUnpaid.toFixed(2)} lei
                    </span>
                  )}
                  {expandedMonth === m.key ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </div>
              </button>

              {expandedMonth === m.key && (
                <div className="p-4 space-y-4 border-t border-border">
                  {m.sortedCustomers.map(([name, data]) => (
                    <div key={name} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                      <div className="w-full flex items-center justify-between p-3 text-left bg-accent/10">
                        <div className="flex items-center gap-2">
                          <p className="text-foreground font-bold text-sm capitalize">{name}</p>
                          <span className="text-xs text-muted-foreground">
                            ({data.orderCount} order{data.orderCount !== 1 ? 's' : ''})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-primary font-bold text-sm">{data.totalSpent.toFixed(2)} lei</span>
                            {data.unpaid > 0 && (
                              <span className="text-destructive text-xs font-bold ml-2">Unpaid: {data.unpaid.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Order details always visible inside the customer card */}
                      <div className="border-t border-border p-3 space-y-2 bg-card/50">
                        {data.orders.map(order => (
                          <div key={order.id} className="flex items-start justify-between text-sm bg-accent/20 rounded-lg p-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">{new Date(order.date).toLocaleDateString()}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleStatus(order.id); }}
                                  className={`px-2 py-0.5 rounded-full text-xs font-bold border cursor-pointer ${
                                    order.status === 'paid' ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'
                                  }`}
                                >
                                  {order.status === 'paid' ? 'Paid' : 'Unpaid'}
                                </button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {order.items.map(i => `${i.productName} ×${i.quantity}`).join(', ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-primary font-bold">{order.total.toFixed(2)} lei</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeOrder(order.id); }}
                                className="text-muted-foreground hover:text-destructive text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
