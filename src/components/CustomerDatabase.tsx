import React, { useState, useEffect } from 'react';
import { useOrders } from '@/hooks/useStore';
import { Users, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CustomerSummary {
  customer_key: string;
  customer_name: string;
  telegram_id: string | null;
  total_orders: number;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  paid_orders: number;
  unpaid_orders: number;
  last_order_date: string;
}

export function CustomerDatabase() {
  const { toggleStatus } = useOrders();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'last_order_date' | 'total_amount' | 'unpaid_amount'>('last_order_date');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]); // simplified order type for view
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [sortField]);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_summary')
      .select('*')
      .order(sortField, { ascending: false });
    
    if (data) setCustomers(data);
    setLoading(false);
  };

  const fetchCustomerOrders = async (key: string, tgId: string | null, name: string) => {
    setOrdersLoading(true);
    let query = supabase.from('orders').select('*').order('date', { ascending: false });
    
    if (tgId) {
      query = query.eq('telegram_id', tgId);
    } else {
      query = query.eq('customerName', name);
    }

    const { data } = await query;
    if (data) setCustomerOrders(data);
    setOrdersLoading(false);
  };

  const toggleExpand = (c: CustomerSummary) => {
    if (expandedKey === c.customer_key) {
      setExpandedKey(null);
    } else {
      setExpandedKey(c.customer_key);
      fetchCustomerOrders(c.customer_key, c.telegram_id, c.customer_name);
    }
  };

  const handleToggle = async (id: string) => {
    await toggleStatus(id);
    // Refresh the list after a delay for DB to update view (or just update local state)
    setTimeout(fetchCustomers, 1000);
    // Also update the expanded orders
    setCustomerOrders(prev => prev.map(o => o.id === id ? { ...o, status: o.status === 'paid' ? 'unpaid' : 'paid' } : o));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="bakery-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="font-display text-2xl pink-text flex items-center gap-2">
            <Users className="w-6 h-6" /> Customer Database
          </h2>
          <div className="flex bg-white dark:bg-zinc-900 rounded-xl p-1 shadow-sm border border-zinc-100 dark:border-zinc-800">
            <Button 
              size="sm" 
              variant={sortField === 'last_order_date' ? 'default' : 'ghost'} 
              onClick={() => setSortField('last_order_date')}
              className={sortField === 'last_order_date' ? 'bg-pink-100 text-pink-700 hover:bg-pink-200 shadow-none' : ''}
            >
              Recent
            </Button>
            <Button 
              size="sm" 
              variant={sortField === 'total_amount' ? 'default' : 'ghost'} 
              onClick={() => setSortField('total_amount')}
              className={sortField === 'total_amount' ? 'bg-pink-100 text-pink-700 hover:bg-pink-200 shadow-none' : ''}
            >
              Top Spenders
            </Button>
            <Button 
              size="sm" 
              variant={sortField === 'unpaid_amount' ? 'default' : 'ghost'} 
              onClick={() => setSortField('unpaid_amount')}
              className={sortField === 'unpaid_amount' ? 'bg-pink-100 text-pink-700 hover:bg-pink-200 shadow-none' : ''}
            >
              Pending Balance
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-3 text-sm font-semibold text-zinc-500">Customer</th>
                <th className="p-3 text-sm font-semibold text-zinc-500">Total Orders</th>
                <th className="p-3 text-sm font-semibold text-zinc-500">Total Spent</th>
                <th className="p-3 text-sm font-semibold text-zinc-500 text-green-600">Paid</th>
                <th className="p-3 text-sm font-semibold text-zinc-500 text-amber-600">Unpaid</th>
                <th className="p-3 text-sm font-semibold text-zinc-500">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={6} className="text-center p-8 text-zinc-400">Loading customers...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-8 text-zinc-400">No customer data available.</td></tr>
              ) : (
                customers.map((c) => (
                  <React.Fragment key={c.customer_key}>
                    <tr 
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(c)}
                    >
                      <td className="p-3">
                        <div className="font-medium text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 font-bold text-xs">
                            {c.customer_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-2">
                            {c.customer_name}
                            {expandedKey === c.customer_key ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                          </div>
                        </div>
                        {c.telegram_id && <div className="text-xs text-zinc-400 ml-10">TG ID: {c.telegram_id}</div>}
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-300 font-medium">
                        {c.total_orders} <span className="text-xs text-zinc-400 font-normal">({c.paid_orders}P / {c.unpaid_orders}U)</span>
                      </td>
                      <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-100">
                        {Number(c.total_amount).toLocaleString()} lei
                      </td>
                      <td className="p-3 font-semibold text-green-600">
                        {Number(c.paid_amount).toLocaleString()} lei
                      </td>
                      <td className="p-3 font-semibold text-amber-500">
                        {c.unpaid_amount > 0 ? `${Number(c.unpaid_amount).toLocaleString()} lei` : '-'}
                      </td>
                      <td className="p-3 text-sm text-zinc-500 whitespace-nowrap">
                        {new Date(c.last_order_date).toLocaleDateString()}
                      </td>
                    </tr>
                    
                    {/* Expanded Orders Detail */}
                    {expandedKey === c.customer_key && (
                      <tr className="bg-zinc-50/50 dark:bg-zinc-900/30 animate-in slide-in-from-top duration-200">
                        <td colSpan={6} className="p-4 border-l-2 border-pink-400">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-2">Order History</h4>
                            {ordersLoading ? (
                              <div className="text-xs text-muted-foreground p-2">Loading orders...</div>
                            ) : customerOrders.length === 0 ? (
                              <div className="text-xs text-muted-foreground p-2">No individual orders found.</div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {customerOrders.map(o => (
                                  <div key={o.id} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-sm">
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate">
                                        {new Date(o.date).toLocaleDateString()} · {o.total.toFixed(2)} lei
                                      </p>
                                      <p className="text-[10px] text-zinc-400 truncate">
                                        {o.items?.map((i: any) => `${i.productName}×${i.quantity}`).join(', ')}
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant={o.status === 'paid' ? 'outline' : 'default'}
                                      onClick={(e) => { e.stopPropagation(); handleToggle(o.id); }}
                                      className={`h-7 px-3 text-[10px] font-bold rounded-full transition-all ${
                                        o.status === 'paid' 
                                          ? 'border-green-200 text-green-600 hover:bg-green-50' 
                                          : 'bg-amber-500 hover:bg-amber-600 text-white border-none'
                                      }`}
                                    >
                                      {o.status === 'paid' ? <><Check className="w-3 h-3 mr-1" /> Paid</> : <><X className="w-3 h-3 mr-1" /> Unpaid</>}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
