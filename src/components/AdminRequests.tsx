import { useState } from 'react';
import { useProductRequests, useProducts, useOrders } from '@/hooks/useStore';
import { ClipboardList, Clock, CheckCircle2, XCircle, Loader2, Trash2, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ProductRequest } from '@/types';

type Filter = 'all' | 'pending' | 'noted' | 'declined' | 'completed';

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50' },
  noted: { label: 'Noted ✓', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50' },
  declined: { label: 'Declined', icon: XCircle, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50' },
  completed: { label: 'Completed 🏆', icon: CheckCircle2, color: 'text-zinc-500 dark:text-zinc-400', bg: 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' },
};

function RequestRow({ req, onStatusChange, onDelete }: { req: ProductRequest; onStatusChange: (id: string, status: ProductRequest['status']) => void; onDelete: (id: string) => void }) {
  const status = STATUS_CONFIG[req.status];
  const StatusIcon = status.icon;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-100">{req.product_name}</h3>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">×{req.quantity}</span>
          </div>
          {req.description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{req.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {req.first_name}
              <div className="flex items-center gap-1.5 ml-1">
                  {req.username && <span className="text-[#2ba3e3]">@{req.username}</span>}
                  <a
                    href={req.username ? `https://t.me/${req.username}` : `tg://user?id=${req.telegram_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors shadow-sm"
                    title={req.username ? `Message @${req.username} on Telegram` : `Open Telegram Profile (ID: ${req.telegram_id})`}
                  >
                    <MessageSquare className="w-3 h-3" />
                  </a>
                </div>
            </span>
            <span className="text-[10px] text-zinc-400">
              {new Date(req.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Status Badge + Controls */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${status.color} ${status.bg}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {status.label}
            </span>
            <button
              onClick={() => confirm('Are you sure you want to delete this single request?') && onDelete(req.id)}
              className="p-2 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shadow-sm border border-zinc-100 dark:border-zinc-800"
              title="Delete Request"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-1 flex-wrap justify-end">
            {req.status !== 'completed' && (
              <button
                onClick={() => onStatusChange(req.id, 'completed')}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm transition-colors"
              >
                Complete
              </button>
            )}
            {req.status !== 'noted' && req.status !== 'completed' && (
              <button
                onClick={() => onStatusChange(req.id, 'noted')}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800/50 transition-colors"
              >
                Mark Noted
              </button>
            )}
            {req.status !== 'pending' && (
              <button
                onClick={() => onStatusChange(req.id, 'pending')}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/50 transition-colors"
              >
                Pending
              </button>
            )}
            {req.status !== 'declined' && req.status !== 'completed' && (
              <button
                onClick={() => onStatusChange(req.id, 'declined')}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800/50 transition-colors"
              >
                Decline
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminRequests() {
  const { requests, loading, updateRequestStatus, deleteRequest, clearRequestsByStatus } = useProductRequests();
  const { products } = useProducts();
  const { addOrder } = useOrders();
  const [filter, setFilter] = useState<Filter>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  // Filter out archived items from the main lists
  const activeRequests = requests.filter(r => r.status !== 'archived');

  const filtered = filter === 'all' 
    ? activeRequests.filter(r => r.status !== 'completed') 
    : activeRequests.filter(r => r.status === filter);

  const counts = {
    all: activeRequests.filter(r => r.status !== 'completed').length,
    pending: activeRequests.filter(r => r.status === 'pending').length,
    noted: activeRequests.filter(r => r.status === 'noted').length,
    declined: activeRequests.filter(r => r.status === 'declined').length,
    completed: activeRequests.filter(r => r.status === 'completed').length,
  };

  const handleStatusChange = async (id: string, status: ProductRequest['status']) => {
    setUpdating(id);
    const ok = await updateRequestStatus(id, status);
    
    if (ok) {
      toast.success(`Request marked as "${status}"`);
      
      // If completed, automatically create an order in the Customers tab
      if (status === 'completed') {
        const req = requests.find(r => r.id === id);
        if (req) {
          // 🔎 SEARCH: check if this customer already exists by username
          let finalCustomerName = req.first_name;
          if (req.username) {
            const { data: existingCustomer } = await supabase
              .from('customer_summary')
              .select('customer_name')
              .eq('username', req.username)
              .maybeSingle();
            
            if (existingCustomer) {
              finalCustomerName = existingCustomer.customer_name;
            }
          }

          // Try to find the product price to calculate total
          const product = products.find(p => p.name.toLowerCase() === req.product_name.toLowerCase());
          const price = product?.price || 0;
          const total = price * req.quantity;

          await addOrder({
            customerName: finalCustomerName,
            telegram_id: req.telegram_id,
            username: req.username,
            total: total,
            status: 'unpaid',
            date: new Date().toISOString(),
            items: [{
              productId: product?.id || 'manual-' + Date.now(),
              productName: req.product_name,
              price: price,
              quantity: req.quantity
            }]
          });
          toast.info(`Synced order to ${finalCustomerName} in Customers tab`);
        }
      }
    }
    setUpdating(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-zinc-800 dark:text-zinc-100">Customer Requests</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Baked goods requests from customers</p>
        </div>
      </div>

      {/* Filter Tabs & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'noted', 'declined', 'completed'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all border ${
                filter === f
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 shadow-sm'
              }`}
            >
              {f} <span className="opacity-60">({counts[f]})</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
            {counts.declined > 0 && (
                <button
                    onClick={() => confirm('Permanently remove ALL declined requests?') && clearRequestsByStatus('declined')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors bg-white dark:bg-zinc-900 shadow-sm"
                >
                    <Trash2 className="w-3 h-3" />
                    Clear Declined
                </button>
            )}
            {counts.completed > 0 && (
                <button
                    onClick={() => confirm('Permanently remove ALL completed requests from the history?') && clearRequestsByStatus('completed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors bg-white dark:bg-zinc-900 shadow-sm"
                >
                    <Trash2 className="w-3 h-3" />
                    Clear Completed
                </button>
            )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
          <div className="text-5xl mb-3 opacity-40">🍞</div>
          <p className="font-semibold text-zinc-500 dark:text-zinc-400">No {filter} requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div key={req.id} className="relative">
              {updating === req.id && (
                <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 rounded-2xl z-10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                </div>
              )}
              <RequestRow req={req} onStatusChange={handleStatusChange} onDelete={deleteRequest} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
