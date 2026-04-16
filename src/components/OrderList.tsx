import { Order } from '@/types';
import { Trash2 } from 'lucide-react';

interface Props {
  orders: Order[];
  toggleStatus: (id: string) => void;
  removeOrder: (id: string) => void;
}

export function OrderList({ orders, toggleStatus, removeOrder }: Props) {
  const sorted = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bakery-card rounded-2xl p-4 md:p-6 animate-fade-in">
      <h2 className="font-display text-xl md:text-2xl pink-text mb-4 flex items-center gap-2">
        <span>📦</span> Recent Orders
      </h2>

      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No orders yet 🌸</p>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {sorted.map(order => (
            <div key={order.id} className="bg-accent/30 border border-border rounded-xl p-3 group hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-foreground font-bold text-sm">{order.customerName.startsWith('@') ? order.customerName.slice(1) : order.customerName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{new Date(order.date).toLocaleDateString()}</span>
                  <button
                    onClick={() => toggleStatus(order.id)}
                    className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors cursor-pointer border ${
                      order.status === 'paid' ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'
                    }`}
                  >
                    {order.status === 'paid' ? 'Paid' : 'Unpaid'}
                  </button>
                  <button onClick={() => removeOrder(order.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {order.items.map(i => `${i.productName} ×${i.quantity}`).join(', ')}
              </div>
              <div className="text-right text-primary font-bold text-sm mt-1">{order.total.toFixed(2)} lei</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
