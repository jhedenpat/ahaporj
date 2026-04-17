import { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Order, Expense, Review, ProductRequest } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('baked_products_cache');
      return (cached && cached !== 'undefined') ? JSON.parse(cached) : [];
    } catch (e) {
      console.error('Products cache parse error:', e);
      return [];
    }
  });
  const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    // Only set loading on the very first load
    const isFirstLoad = products.length === 0;
    if (isFirstLoad) setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_available', true);
      if (error) throw error;
      if (data) {
        setProducts(data as Product[]);
        localStorage.setItem('baked_products_cache', JSON.stringify(data));
      }
    } catch (err: unknown) {
      console.error('Fetch products error:', err);
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  }, []); // Remove products.length dependency

  const fetchArchivedProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_available', false)
      .order('name', { ascending: true });
    if (error) return;
    if (data) setArchivedProducts(data as Product[]);
  }, []);


  useEffect(() => {
    fetchProducts();
    fetchArchivedProducts();

    const sub = supabase.channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        console.log('RT: Products Update', payload.eventType);
        const newData = payload.new as Product;
        const oldData = payload.old as Partial<Product>;

        if (payload.eventType === 'INSERT') {
          if (newData.is_available) {
            setProducts(prev => {
              const exists = prev.find(p => p.id === newData.id);
              if (exists) return prev; // Already handled optimistically
              const next = [newData, ...prev];
              localStorage.setItem('baked_products_cache', JSON.stringify(next));
              return next;
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          if (newData.is_available) {
            // Restore context: Merge with existing archived data if possible to preserve large images
            setArchivedProducts(prev => prev.filter(p => p.id !== newData.id));
            setProducts(prev => {
              const existing = prev.find(p => p.id === newData.id);
              // CRITICAL: Preserve image if payload is stripped due to size limit
              const merged = { 
                ...existing, 
                ...newData, 
                image: newData.image || existing?.image || null 
              } as Product;
              
              const next = existing 
                ? prev.map(p => p.id === newData.id ? merged : p)
                : [merged, ...prev];
              localStorage.setItem('baked_products_cache', JSON.stringify(next));
              return next;
            });
          } else {
            // Archive context: Preserve image in archived list as well
            setProducts(prev => {
              const next = prev.filter(p => p.id !== newData.id);
              localStorage.setItem('baked_products_cache', JSON.stringify(next));
              return next;
            });
            setArchivedProducts(prev => {
               const existing = prev.find(p => p.id === newData.id);
               const merged = { 
                 ...existing, 
                 ...newData, 
                 image: newData.image || existing?.image || null 
               } as Product;
               return existing ? prev.map(p => p.id === newData.id ? merged : p) : [merged, ...prev];
            });
          }
        } else if (payload.eventType === 'DELETE') {
          setProducts(prev => {
            const next = prev.filter(p => p.id !== oldData.id);
            localStorage.setItem('baked_products_cache', JSON.stringify(next));
            return next;
          });
          setArchivedProducts(prev => prev.filter(p => p.id !== oldData.id));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('✅ Products Realtime Active');
      });

    return () => { supabase.removeChannel(sub); };
  }, [fetchProducts, fetchArchivedProducts]);

  const addProduct = useCallback(async (name: string, price: number, stock: number, image?: string) => {
    const newProd = { id: crypto.randomUUID(), name, price, stock, image: image || null, category: 'General', is_available: true };
    setProducts(prev => {
      const next = [...prev, newProd as Product];
      localStorage.setItem('baked_products_cache', JSON.stringify(next));
      return next;
    });
    const { error } = await supabase.from('products').insert([newProd]);
    if (error) {
      toast.error('Error adding product: ' + error.message);
      fetchProducts();
    }
  }, [fetchProducts]);

  // Soft-delete: sets is_available=false instead of hard-deleting
  // This preserves reviews linked to this product_id
  const removeProduct = useCallback(async (id: string) => {
    const removed = products.find(p => p.id === id);
    if (!removed) return;

    // 1. Optimistic Update (Immediate)
    setProducts(prev => {
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem('baked_products_cache', JSON.stringify(next));
      return next;
    });
    setArchivedProducts(prev => [removed, ...prev]);

    // 2. Database Update
    const { error } = await supabase
      .from('products')
      .update({ is_available: false })
      .eq('id', id);

    if (error) {
      toast.error('Error archiving product: ' + error.message);
      // Rollback on error
      fetchProducts();
      fetchArchivedProducts();
    } else {
      toast.success('Product archived. Reviews preserved! 🗂️');
    }
  }, [products, fetchProducts, fetchArchivedProducts]);

  // Restore an archived product back to the available menu
  const restoreProduct = useCallback(async (id: string) => {
    const restored = archivedProducts.find(p => p.id === id);
    if (!restored) return;

    // 1. Optimistic Update (Immediate)
    setArchivedProducts(prev => prev.filter(p => p.id !== id));
    setProducts(prev => {
      const next = [restored, ...prev];
      localStorage.setItem('baked_products_cache', JSON.stringify(next));
      return next;
    });

    // 2. Database Update
    const { error } = await supabase
      .from('products')
      .update({ is_available: true })
      .eq('id', id);

    if (error) {
      toast.error('Error restoring product: ' + error.message);
      fetchProducts();
      fetchArchivedProducts();
    } else {
      toast.success('Product restored to menu! All reviews are back ✅');
    }
  }, [archivedProducts, fetchProducts, fetchArchivedProducts]);

  const updateProduct = useCallback(async (id: string, name: string, price: number, stock: number, image?: string) => {
    const updateData: Partial<Product> = { name, price, stock };
    if (image !== undefined) updateData.image = image;
    setProducts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updateData } : p);
      localStorage.setItem('baked_products_cache', JSON.stringify(next));
      return next;
    });
    const { error } = await supabase.from('products').update(updateData).eq('id', id);
    if (error) toast.error('Error updating product: ' + error.message);
  }, []);

  const deductStock = useCallback(async (productId: string, quantity: number) => {
    setProducts(prev => {
      const next = prev.map(p => p.id === productId ? { ...p, stock: Math.max(0, (p.stock || 0) - quantity) } : p);
      localStorage.setItem('baked_products_cache', JSON.stringify(next));
      return next;
    });
    const { error } = await supabase.rpc('deduct_stock', {
      product_id: productId,
      quantity_to_deduct: quantity
    });
    if (error) {
      toast.error('Error deducting stock: ' + error.message);
      fetchProducts();
    }
  }, [fetchProducts]);

  return { products, archivedProducts, loading, addProduct, removeProduct, restoreProduct, updateProduct, deductStock };
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const cached = localStorage.getItem('baked_orders_cache');
      return (cached && cached !== 'undefined') ? JSON.parse(cached) : [];
    } catch (e) {
      console.error('Orders cache parse error:', e);
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('orders').select('*');
      if (error) throw error;
      if (data) {
        setOrders(data as Order[]);
        localStorage.setItem('baked_orders_cache', JSON.stringify(data));
      }
    } catch (err: unknown) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

    useEffect(() => {
      fetchOrders();
  
      const sub = supabase.channel('orders-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            console.log('RT: Orders Update', payload.eventType);
            if (payload.eventType === 'INSERT') {
              setOrders(prev => [payload.new as Order, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
            } else if (payload.eventType === 'DELETE') {
              setOrders(prev => prev.filter(o => o.id !== payload.old.id));
            }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') console.log('✅ Orders Realtime Active');
        });
        
      return () => { supabase.removeChannel(sub); };
    }, [fetchOrders]);

  const addOrder = useCallback(async (order: Omit<Order, 'id'>) => {
    const newOrder = { ...order, id: crypto.randomUUID() };
    setOrders(prev => [...prev, newOrder as Order]); // Optimistic
    const { error } = await supabase.from('orders').insert([newOrder]);
    if (error) {
      toast.error('Error placing order: ' + error.message);
    } else {
      // Fetch settings for notification
      const { data: settingsData } = await supabase.from('settings').select('key, value');
      const settingsMap: Record<string, string> = {};
      settingsData?.forEach(s => settingsMap[s.key] = s.value);
      
      const token = settingsMap['tele_bot_token'];
      const chatId = settingsMap['admin_tele_id'];
      
      if (token && chatId) {
        const message = `🛍️ *New Order Received!*\n\n` +
          `👤 *Customer:* ${order.customerName}\n` +
          `💰 *Total:* ₱ ${order.total}\n` +
          `📦 *Items:* ${order.items.length}\n` +
          `🕒 *Time:* ${new Date().toLocaleTimeString()}\n\n` +
          `Check the dashboard for details! 🥐`;
          
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
        }).catch(err => console.error('Telegram Notify Error:', err));
      }
    }
  }, []);

  const toggleStatus = useCallback(async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (order) {
      const newStatus = order.status === 'paid' ? 'unpaid' : 'paid';
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o)); // Optimistic
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
      if (error) toast.error('Error updating order: ' + error.message);
    }
  }, [orders]);

  const removeOrder = useCallback(async (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id)); // Optimistic
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) toast.error('Error deleting order: ' + error.message);
  }, []);

  return { orders, addOrder, toggleStatus, removeOrder };
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setExpenses(data as Expense[]);
    } catch (err: unknown) {
      console.error('Fetch expenses error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

    const channelName = useMemo(() => `expenses_rt_${Math.random().toString(36).substring(7)}`, []);
    useEffect(() => {
      fetchExpenses();
  
      const sub = supabase.channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, (payload) => {
            console.log('RT: Expenses Update', payload.eventType);
            fetchExpenses();
        })
        .subscribe();
        
      return () => { supabase.removeChannel(sub); };
    }, [fetchExpenses, channelName]);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
    const newExpense = { ...expense, id: crypto.randomUUID() };
    setExpenses(prev => [...prev, newExpense as Expense]); // Optimistic
    const { error } = await supabase.from('expenses').insert([newExpense]);
    if (error) {
        toast.error('Error adding expense: ' + error.message);
        fetchExpenses();
    }
  }, [fetchExpenses]);

  const removeExpense = useCallback(async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id)); // Optimistic
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
        toast.error('Error deleting expense: ' + error.message);
        fetchExpenses();
    }
  }, [fetchExpenses]);

  return { expenses, loading, addExpense, removeExpense };
}

// ── Reviews ──────────────────────────────────────────────────────
export function useReviews(productId?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query;
    if (error) {
        console.error('Fetch reviews error:', error);
        return;
    }
    if (data) setReviews(data as Review[]);
  }, [productId]);

  const channelName = useMemo(() => 'reviews_rt_' + (productId ?? 'all') + '_' + Math.random().toString(36).substring(7), [productId]);
  useEffect(() => {
    setLoading(true);
    fetchReviews().finally(() => setLoading(false));

    const sub = supabase.channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'reviews'
        }, 
        (payload) => {
          console.log('RT: Reviews Update', payload.eventType);
          fetchReviews();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [productId, fetchReviews, channelName]);

  const addReview = useCallback(async (
    product_id: string | null,
    telegram_id: string,
    first_name: string,
    rating: number,
    comment: string,
    username?: string,
  ) => {
    const newReview = {
      product_id,
      telegram_id,
      first_name,
      username: username || null,
      rating,
      comment,
    };
    const { error } = await supabase.from('reviews').insert([newReview]);
    if (error) {
      toast.error('Failed to submit review: ' + error.message);
      return false;
    }
    await fetchReviews(); // Instant update
    toast.success('Review submitted! Thank you 🎉');
    return true;
  }, [fetchReviews]);

  const deleteReview = useCallback(async (id: string) => {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete review: ' + error.message);
      return;
    }
    await fetchReviews();
  }, [fetchReviews]);

  return { reviews, loading, addReview, deleteReview };
}

// ── Product Requests ─────────────────────────────────────────────
export function useProductRequests(telegramId?: string) {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    let query = supabase.from('product_requests').select('*');
    if (telegramId) {
      query = query.eq('telegram_id', telegramId);
    }
    const { data } = await query.order('created_at', { ascending: false });
    if (data) setRequests(data as ProductRequest[]);
    setLoading(false);
  }, [telegramId]);

  const channelName = useMemo(() => `requests_rt_${Math.random().toString(36).substring(7)}`, []);
  useEffect(() => {
    fetchRequests();

    const sub = supabase.channel(channelName)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'product_requests' }, 
        (payload) => {
          console.log('RT: Requests Update', payload.eventType);
          const newData = payload.new as ProductRequest;
          if (payload.eventType === 'INSERT') {
            if (!telegramId || newData.telegram_id === telegramId) {
              setRequests(prev => [newData, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setRequests(prev => prev.map(r => r.id === newData.id ? { ...r, ...newData } : r));
          } else if (payload.eventType === 'DELETE') {
            setRequests(prev => prev.filter(r => r.id === payload.old.id));
          }
          fetchRequests();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [fetchRequests]);

  const submitRequest = useCallback(async (
    telegram_id: string,
    first_name: string,
    product_name: string,
    description: string,
    quantity: number,
    username?: string,
  ) => {
    const newReq = { 
        id: 'temp-' + Date.now(),
        telegram_id, 
        first_name, 
        username: username || null, 
        product_name, 
        description, 
        quantity,
        status: 'pending' as const,
        created_at: new Date().toISOString()
    };
    
    // Optimistic update
    setRequests(prev => [newReq, ...prev]);

    const { error } = await supabase.from('product_requests').insert([{
        telegram_id, first_name, username, product_name, description, quantity
    }]);

    if (error) {
      toast.error('Failed to submit request: ' + error.message);
      // Rollback on error
      fetchRequests();
      return false;
    }
    await fetchRequests(); // sync with server
    toast.success('Request submitted! We\'ll get back to you soon 🍞');

    // Send Telegram Notification
    try {
      const { data: settingsData } = await supabase.from('settings').select('key, value');
      const settingsMap: Record<string, string> = {};
      settingsData?.forEach(s => settingsMap[s.key] = s.value);
      
      const token = settingsMap['tele_bot_token'];
      const chatId = settingsMap['admin_tele_id'];
      
      if (token && chatId) {
        const message = `🥖 *New Baked Good Request!*\n\n` +
          `👤 *From:* ${first_name}${username ? ` (@${username})` : ''}\n` +
          `🍞 *Product:* ${product_name}\n` +
          `🔢 *Qty:* ${quantity}\n` +
          `📝 *Notes:* ${description || 'No extra notes'}\n\n` +
          `Don't forget to check the requests tab! 🍰`;
          
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
        }).catch(err => console.error('Telegram Notify Error:', err));
      }
    } catch (e) {
      console.error('Telegram Notification failed:', e);
    }

    return true;
  }, [fetchRequests]);

  const updateRequestStatus = useCallback(async (id: string, status: ProductRequest['status']) => {
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));

    const { error } = await supabase.from('product_requests').update({ status }).eq('id', id);
    if (error) {
      toast.error('Failed to update status: ' + error.message);
      fetchRequests(); // Rollback
      return false;
    }
    
    await fetchRequests(); // re-sync
    return true;
  }, [fetchRequests]);

  const deleteRequest = useCallback(async (id: string) => {
    // Soft delete: update status to 'archived' instead of real delete
    setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'archived' } : req));
    const { error } = await supabase.from('product_requests').update({ status: 'archived' }).eq('id', id);
    if (error) {
        toast.error('Failed to archive request: ' + error.message);
        fetchRequests();
    }
  }, [fetchRequests]);

  const clearRequestsByStatus = useCallback(async (status: ProductRequest['status']) => {
    // Soft delete everything with this status
    setRequests(prev => prev.map(r => r.status === status ? { ...r, status: 'archived' } : r));
    const { error } = await supabase.from('product_requests').update({ status: 'archived' }).eq('status', status);
    if (error) {
        toast.error(`Failed to archive ${status} requests: ` + error.message);
        fetchRequests();
    } else {
        toast.success(`Archived all ${status} requests`);
    }
  }, [fetchRequests]);

  return { requests, loading, submitRequest, updateRequestStatus, deleteRequest, clearRequestsByStatus };
}

// ── Settings ────────────────────────────────────────────────────
export function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('key, value');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((row: { key: string; value: string }) => { map[row.key] = row.value; });
      setSettings(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
    const sub = supabase.channel('settings_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchSettings)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetchSettings]);

  const updateSetting = useCallback(async (key: string, value: string) => {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) { toast.error('Failed to update setting: ' + error.message); return false; }
    toast.success('Setting updated!');
    return true;
  }, []);

  return { settings, loading, updateSetting, refetch: fetchSettings };
}

// ── Admin Account Management ──────────────────────────────────────
export function useAdmins() {
  const [admins, setAdmins] = useState<{ id: string; username: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdmins = useCallback(async () => {
    const { data } = await supabase.from('admins').select('id, username, created_at').order('created_at');
    if (data) setAdmins(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const addAdmin = useCallback(async (username: string, password: string) => {
    if (!username.trim() || !password.trim()) return false;
    const { error } = await supabase.from('admins').insert([{ username: username.trim(), password }]);
    if (error) { toast.error('Failed to add admin: ' + error.message); return false; }
    toast.success(`Admin "${username}" added!`);
    fetchAdmins();
    return true;
  }, [fetchAdmins]);

  const updateAdmin = useCallback(async (id: string, username: string, password: string) => {
    const updates: Record<string, string> = {};
    if (username.trim()) updates.username = username.trim();
    if (password.trim()) updates.password = password;
    if (Object.keys(updates).length === 0) return false;
    const { error } = await supabase.from('admins').update(updates).eq('id', id);
    if (error) { toast.error('Failed to update admin: ' + error.message); return false; }
    toast.success('Admin updated!');
    fetchAdmins();
    return true;
  }, [fetchAdmins]);

  const deleteAdmin = useCallback(async (id: string) => {
    const { error } = await supabase.from('admins').delete().eq('id', id);
    if (error) { toast.error('Failed to delete admin: ' + error.message); return; }
    toast.success('Admin removed.');
    fetchAdmins();
  }, [fetchAdmins]);

  return { admins, loading, addAdmin, updateAdmin, deleteAdmin };
}

// ── Monthly Summaries ───────────────────────────────────────────────
export interface MonthlySummaryRow {
  id: string;
  month: number;
  year: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  total_orders: number;
  paid_orders: number;
  unpaid_orders: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useMonthlySummaries() {
  const [summaries, setSummaries] = useState<MonthlySummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummaries = useCallback(async () => {
    const { data } = await supabase
      .from('monthly_summaries')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    if (data) setSummaries(data as MonthlySummaryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSummaries();

    // ── REALTIME: Listen for "Automatic Brain" updates! ───────────
    const sub = supabase.channel('monthly_summaries_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_summaries' }, fetchSummaries)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [fetchSummaries]);

  const saveSnapshot = useCallback(async (snap: Omit<MonthlySummaryRow, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase
      .from('monthly_summaries')
      .upsert({ ...snap, updated_at: new Date().toISOString() }, { onConflict: 'month,year' });
    if (error) { toast.error('Failed to save snapshot: ' + error.message); return false; }
    toast.success('Monthly snapshot saved!');
    fetchSummaries();
    return true;
  }, [fetchSummaries]);

  return { summaries, loading, saveSnapshot, refetch: fetchSummaries };
}
