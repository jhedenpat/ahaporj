import { Order } from '@/types';
import { Trash2, Printer } from 'lucide-react';

interface Props {
  orders: Order[];
  toggleStatus: (id: string) => void;
  removeOrder: (id: string) => void;
}

const printReceipt = (order: Order) => {
  const receiptWindow = window.open('', '_blank', 'width=380,height=600,scrollbars=yes');
  if (!receiptWindow) {
    alert('Pop-up blocked! Please allow pop-ups for this site to print receipts.');
    return;
  }

  const dateStr = new Date(order.date).toLocaleString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const itemRows = order.items.map(item => `
    <tr>
      <td style="padding:4px 0">${item.productName}</td>
      <td style="text-align:center;padding:4px 8px">×${item.quantity}</td>
      <td style="text-align:right;padding:4px 0">₱${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const paymentMethod = order.payment_method
    ? `<p style="margin:2px 0;font-size:12px;color:#888">Payment: ${order.payment_method}</p>`
    : '';

  receiptWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${order.customerName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 13px;
          color: #222;
          background: #fff;
          padding: 20px;
          width: 320px;
          margin: 0 auto;
        }
        .header { text-align: center; margin-bottom: 12px; }
        .shop-name { font-size: 22px; font-weight: bold; font-style: italic; color: #e05a8a; letter-spacing: 1px; }
        .tagline { font-size: 10px; color: #999; margin-top: 2px; }
        .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
        .info { font-size: 11px; color: #555; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 10px; text-transform: uppercase; color: #999; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        th:last-child { text-align: right; }
        th:nth-child(2) { text-align: center; }
        .total-row td { font-weight: bold; font-size: 15px; border-top: 1px dashed #ccc; padding-top: 8px; margin-top: 6px; }
        .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #aaa; }
        .paid-stamp {
          text-align: center;
          margin: 12px 0;
          font-size: 20px;
          font-weight: bold;
          color: #16a34a;
          border: 2px solid #16a34a;
          border-radius: 6px;
          padding: 4px 0;
          letter-spacing: 3px;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">🧁 Aha Bakeshop</div>
        <div class="tagline">Order & Management</div>
      </div>

      <div class="divider"></div>

      <p class="info"><strong>Customer:</strong> ${order.customerName.startsWith('@') ? order.customerName.slice(1) : order.customerName}</p>
      ${order.username ? `<p class="info"><strong>Username:</strong> @${order.username}</p>` : ''}
      <p class="info"><strong>Date:</strong> ${dateStr}</p>
      ${paymentMethod}

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th style="text-align:left">Item</th>
            <th>Qty</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          <tr class="total-row">
            <td colspan="2">TOTAL</td>
            <td style="text-align:right">₱${order.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div class="paid-stamp">✓ PAID</div>

      <div class="divider"></div>
      <div class="footer">
        Thank you for your purchase! 🌸<br/>
        Please come again.
      </div>

    </body>
    </html>
  `);
  receiptWindow.document.close();
  // Delay print so the document fully renders before the dialog opens
  setTimeout(() => {
    try {
      receiptWindow.focus();
      receiptWindow.print();
      receiptWindow.onafterprint = () => receiptWindow.close();
    } catch (e) {
      // If auto-print fails, the window stays open for manual print
    }
  }, 400);
};

export function OrderList({ orders, toggleStatus, removeOrder }: Props) {
  const sorted = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleToggle = (order: Order) => {
    const willBePaid = order.status === 'unpaid';
    // Trigger DB update first
    toggleStatus(order.id);
    // Delay print by 600ms so Supabase update completes before print dialog opens
    if (willBePaid) {
      setTimeout(() => printReceipt({ ...order, status: 'paid' }), 600);
    }
  };

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
                    onClick={() => handleToggle(order)}
                    className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors cursor-pointer border ${
                      order.status === 'paid' ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'
                    }`}
                  >
                    {order.status === 'paid' ? 'Paid' : 'Unpaid'}
                  </button>
                  {/* Manual print button for already-paid orders */}
                  {order.status === 'paid' && (
                    <button
                      onClick={() => printReceipt(order)}
                      title="Print Receipt"
                      className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => removeOrder(order.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {order.items.map(i => `${i.productName} ×${i.quantity}`).join(', ')}
              </div>
              <div className="text-right text-primary font-bold text-sm mt-1">₱ {order.total.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
