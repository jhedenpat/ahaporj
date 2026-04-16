import { useState } from 'react';
import { Product, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Minus, ShoppingCart, Trash2 } from 'lucide-react';

interface Props {
  products: Product[];
  addOrder: (order: { customerName: string; items: OrderItem[]; total: number; status: 'paid' | 'unpaid'; date: string }) => void;
}

export function OrderEntry({ products, addOrder }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [status, setStatus] = useState<'paid' | 'unpaid'>('unpaid');

  const addItem = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, productName: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.productId === productId) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : i;
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = () => {
    if (!customerName.trim() || items.length === 0) return;
    addOrder({ customerName: customerName.trim(), items: [...items], total, status, date: new Date().toISOString() });
    setCustomerName('');
    setItems([]);
    setStatus('unpaid');
  };

  return (
    <div className="bakery-card rounded-2xl p-4 md:p-6 animate-fade-in">
      <h2 className="font-display text-xl md:text-2xl pink-text mb-4 flex items-center gap-2">
        <span>📋</span> New Order
      </h2>

      <Input
        placeholder="Customer Name"
        value={customerName}
        onChange={e => setCustomerName(e.target.value)}
        className="mb-4 rounded-xl bg-blush border-border focus:border-primary"
      />

      {products.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">Add products first in Product Management 🧁</p>
      ) : (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Tap to add items:</p>
          <div className="flex flex-wrap gap-2">
            {products.map(p => (
              <button
                key={p.id}
                onClick={() => addItem(p)}
                className="bg-accent/60 hover:bg-accent border border-border hover:border-primary/40 rounded-xl px-3 py-2 text-left transition-all text-sm hover:shadow-md"
              >
                <span className="text-foreground font-semibold">{p.name}</span>
                <span className="text-primary ml-2 font-bold">{p.price.toFixed(2)} lei</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-accent/30 rounded-xl p-3 mb-4 space-y-2 border border-border">
          {items.map(item => (
            <div key={item.productId} className="flex items-center justify-between text-sm">
              <span className="text-foreground flex-1 min-w-0 truncate font-medium">{item.productName}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.productId, -1)} className="text-primary hover:bg-primary/10 w-6 h-6 flex items-center justify-center rounded-full border border-primary/30"><Minus className="w-3 h-3" /></button>
                <span className="text-foreground font-bold w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, 1)} className="text-primary hover:bg-primary/10 w-6 h-6 flex items-center justify-center rounded-full border border-primary/30"><Plus className="w-3 h-3" /></button>
                <span className="text-primary font-bold w-16 text-right">{(item.price * item.quantity).toFixed(2)}</span>
                <button onClick={() => removeItem(item.productId)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between items-center">
            <span className="text-foreground font-bold">Current Total</span>
            <span className="pink-text font-display text-xl font-bold">{total.toFixed(2)} lei</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium">Status:</span>
          <button
            onClick={() => setStatus(s => s === 'paid' ? 'unpaid' : 'paid')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
              status === 'paid' ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'
            }`}
          >
            {status === 'paid' ? '✓ Paid' : '✗ Unpaid'}
          </button>
        </div>
        <Button onClick={handleSubmit} disabled={!customerName.trim() || items.length === 0} className="pink-gradient rounded-xl text-primary-foreground font-bold shadow-md hover:shadow-lg transition-shadow flex-1 sm:flex-none">
          <ShoppingCart className="w-4 h-4" /> Place Order
        </Button>
      </div>
    </div>
  );
}
