import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Order, Expense, ProductRequest } from '@/types';
import { toast } from 'sonner';

// ── SINGLETON STATE (Outside of hooks to share across all components) ──
let globalProducts: Product[] = [];
let globalArchivedProducts: Product[] = [];
let globalOrders: Order[] = [];
let globalExpenses: Expense[] = [];
let globalRequests: ProductRequest[] = [];

const productListeners = new Set<(p: Product[]) => void>();
const archivedProductListeners = new Set<(p: Product[]) => void>();
const orderListeners = new Set<(o: Order[]) => void>();
const expenseListeners = new Set<(e: Expense[]) => void>();
const requestListeners = new Set<(r: ProductRequest[]) => void>();

// Helper to notify all listeners
const notifyProducts = () => productListeners.forEach(l => l([...globalProducts]));
const notifyArchived = () => archivedProductListeners.forEach(l => l([...globalArchivedProducts]));
const notifyOrders = () => orderListeners.forEach(l => l([...globalOrders]));
const notifyExpenses = () => expenseListeners.forEach(l => l([...globalExpenses]));
const notifyRequests = () => requestListeners.forEach(l => l([...globalRequests]));

// ── INITIAL FETCHERS ──
const fetchProducts = async () => {
  const { data } = await supabase.from('products').select('*').eq('is_available', true).order('name');
  if (data) {
    globalProducts = data as Product[];
    notifyProducts();
  }
};

const fetchArchivedProducts = async () => {
  const { data } = await supabase.from('products').select('*').eq('is_available', false).order('name');
  if (data) {
    globalArchivedProducts = data as Product[];
    notifyArchived();
  }
};

const fetchOrders = async () => {
  const { data } = await supabase.from('orders').select('*').order('date', { ascending: false });
  if (data) {
    globalOrders = data as Order[];
    notifyOrders();
  }
};

const fetchExpenses = async () => {
  const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (data) {
    globalExpenses = data as Expense[];
    notifyExpenses();
  }
};

const fetchRequests = async () => {
  const { data } = await supabase.from('product_requests').select('*').order('created_at', { ascending: false });
  if (data) {
    globalRequests = data as ProductRequest[];
    notifyRequests();
  }
};

// ── REALTIME SETUP (Single instance) ──
let isRealtimeInitialized = false;

const initRealtime = () => {
  if (isRealtimeInitialized) return;
  isRealtimeInitialized = true;

  console.log('⚡ Initializing Global Realtime Store...');

  // Products Channel
  supabase.channel('global-products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
      console.log('RT: Products change', payload.eventType);
      fetchProducts();
      fetchArchivedProducts();
    })
    .subscribe();

  // Orders Channel
  supabase.channel('global-orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      console.log('RT: Orders change', payload.eventType);
      fetchOrders();
    })
    .subscribe();

  // Expenses Channel
  supabase.channel('global-expenses')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, (payload) => {
      fetchExpenses();
    })
    .subscribe();

  // Requests Channel
  supabase.channel('global-requests')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'product_requests' }, (payload) => {
      fetchRequests();
    })
    .subscribe();
};

// Start initial load
fetchProducts();
fetchArchivedProducts();
fetchOrders();
fetchExpenses();
fetchRequests();
initRealtime();

// ── HOOKS (Now just consumers of the singleton) ──

export function useProducts() {
  const [products, setProducts] = useState(globalProducts);
  const [archivedProducts, setArchivedProducts] = useState(globalArchivedProducts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    productListeners.add(setProducts);
    archivedProductListeners.add(setArchivedProducts);
    // Sync local state if singleton changed while unmounted
    setProducts([...globalProducts]);
    setArchivedProducts([...globalArchivedProducts]);
    return () => {
      productListeners.delete(setProducts);
      archivedProductListeners.add(setArchivedProducts);
    };
  }, []);

  const addProduct = async (name: string, price: number, stock: number, image?: string) => {
    const { error } = await supabase.from('products').insert([{ name, price, stock, image, is_available: true }]);
    if (error) toast.error(error.message);
  };

  const removeProduct = async (id: string) => {
    const { error } = await supabase.from('products').update({ is_available: false }).eq('id', id);
    if (error) toast.error(error.message);
  };

  const restoreProduct = async (id: string) => {
    const { error } = await supabase.from('products').update({ is_available: true }).eq('id', id);
    if (error) toast.error(error.message);
  };

  const updateProduct = async (id: string, name: string, price: number, stock: number, image?: string) => {
    const { error } = await supabase.from('products').update({ name, price, stock, image }).eq('id', id);
    if (error) toast.error(error.message);
  };

  const deductStock = async (id: string, quantity: number) => {
    await supabase.rpc('deduct_stock', { p_id: id, q: quantity });
  };

  return { products, archivedProducts, loading, addProduct, removeProduct, restoreProduct, updateProduct, deductStock };
}

export function useOrders() {
  const [orders, setOrders] = useState(globalOrders);

  useEffect(() => {
    orderListeners.add(setOrders);
    setOrders([...globalOrders]);
    return () => { orderListeners.delete(setOrders); };
  }, []);

  const addOrder = async (order: Omit<Order, 'id'>) => {
    const { error } = await supabase.from('orders').insert([order]);
    if (error) toast.error(error.message);
  };

  const toggleStatus = async (id: string) => {
    const order = globalOrders.find(o => o.id === id);
    if (order) {
      const { error } = await supabase.from('orders').update({ status: order.status === 'paid' ? 'unpaid' : 'paid' }).eq('id', id);
      if (error) toast.error(error.message);
    }
  };

  const removeOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) toast.error(error.message);
  };

  return { orders, addOrder, toggleStatus, removeOrder };
}

export function useExpenses() {
  const [expenses, setExpenses] = useState(globalExpenses);

  useEffect(() => {
    expenseListeners.add(setExpenses);
    setExpenses([...globalExpenses]);
    return () => { expenseListeners.delete(setExpenses); };
  }, []);

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    const { error } = await supabase.from('expenses').insert([expense]);
    if (error) toast.error(error.message);
  };

  const removeExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) toast.error(error.message);
  };

  return { expenses, addExpense, removeExpense };
}

export function useProductRequests() {
  const [requests, setRequests] = useState(globalRequests);

  useEffect(() => {
    requestListeners.add(setRequests);
    setRequests([...globalRequests]);
    return () => { requestListeners.delete(setRequests); };
  }, []);

  const updateRequestStatus = async (id: string, status: ProductRequest['status']) => {
    const { error } = await supabase.from('product_requests').update({ status }).eq('id', id);
    return !error;
  };

  const deleteRequest = async (id: string) => {
    const { error } = await supabase.from('product_requests').delete().eq('id', id);
    if (error) toast.error(error.message);
  };

  const clearRequestsByStatus = async (status: ProductRequest['status']) => {
    const { error } = await supabase.from('product_requests').delete().eq('status', status);
    if (error) toast.error(error.message);
  };

  return { requests, loading: false, updateRequestStatus, deleteRequest, clearRequestsByStatus };
}
