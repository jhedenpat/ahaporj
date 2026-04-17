import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Order, Expense, ProductRequest, Review } from '@/types';
import { toast } from 'sonner';

// ── TYPES ──
export interface Admin { id: string; username: string; created_at: string; }
export interface MonthlySummary {
  id: string; month: number; year: number; total_revenue: number; total_expenses: number;
  net_profit: number; total_orders: number; paid_orders: number; unpaid_orders: number;
  notes?: string; updated_at: string;
}

// ── SINGLETON STATE ──
let globalProducts: Product[] = [];
let globalArchived: Product[] = [];
let globalOrders: Order[] = [];
let globalExpenses: Expense[] = [];
let globalRequests: ProductRequest[] = [];
let globalReviews: Review[] = [];
let globalAdmins: Admin[] = [];
let globalSettings: Record<string, string> = {};
let globalSummaries: MonthlySummary[] = [];

const listeners = {
  products: new Set<(p: Product[]) => void>(),
  archived: new Set<(p: Product[]) => void>(),
  orders: new Set<(o: Order[]) => void>(),
  expenses: new Set<(e: Expense[]) => void>(),
  requests: new Set<(r: ProductRequest[]) => void>(),
  reviews: new Set<(r: Review[]) => void>(),
  admins: new Set<(a: Admin[]) => void>(),
  settings: new Set<(s: Record<string, string>) => void>(),
  summaries: new Set<(s: MonthlySummary[]) => void>(),
};

const notify = {
  products: () => listeners.products.forEach(l => l([...globalProducts])),
  archived: () => listeners.archived.forEach(l => l([...globalArchived])),
  orders: () => listeners.orders.forEach(l => l([...globalOrders])),
  expenses: () => listeners.expenses.forEach(l => l([...globalExpenses])),
  requests: () => listeners.requests.forEach(l => l([...globalRequests])),
  reviews: () => listeners.reviews.forEach(l => l([...globalReviews])),
  admins: () => listeners.admins.forEach(l => l([...globalAdmins])),
  settings: () => listeners.settings.forEach(l => l({ ...globalSettings })),
  summaries: () => listeners.summaries.forEach(l => l([...globalSummaries])),
};

// ── ZERO-LATENCY PULSE ENGINE ──
const patchState = (table: string, payload: any) => {
  const { eventType, new: newRow, old: oldRow } = payload;
  
  const mergeList = (list: any[], idKey = 'id') => {
    if (eventType === 'INSERT') return [newRow, ...list];
    if (eventType === 'UPDATE') {
      return list.map(item => (item[idKey] === (newRow[idKey] || oldRow[idKey])) ? { ...item, ...newRow } : item);
    }
    if (eventType === 'DELETE') return list.filter(item => item[idKey] !== oldRow[idKey]);
    return list;
  };

  switch (table) {
    case 'products':
      if (eventType === 'DELETE') {
        globalProducts = globalProducts.filter(p => p.id !== oldRow.id);
        globalArchived = globalArchived.filter(p => p.id !== oldRow.id);
      } else {
        const existing = globalProducts.find(p => p.id === (newRow.id || oldRow.id)) || globalArchived.find(p => p.id === (newRow.id || oldRow.id));
        const merged = { ...existing, ...newRow };
        if (merged.is_available) {
          globalProducts = [merged, ...globalProducts.filter(p => p.id !== merged.id)].sort((a,b) => a.name.localeCompare(b.name));
          globalArchived = globalArchived.filter(p => p.id !== merged.id);
        } else {
          globalArchived = [merged, ...globalArchived.filter(p => p.id !== merged.id)].sort((a,b) => a.name.localeCompare(b.name));
          globalProducts = globalProducts.filter(p => p.id !== merged.id);
        }
      }
      notify.products(); notify.archived();
      break;
    case 'orders': globalOrders = mergeList(globalOrders).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()); notify.orders(); break;
    case 'expenses': globalExpenses = mergeList(globalExpenses).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()); notify.expenses(); break;
    case 'product_requests': globalRequests = mergeList(globalRequests).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); notify.requests(); break;
    case 'reviews': globalReviews = mergeList(globalReviews).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); notify.reviews(); break;
    case 'admins': globalAdmins = mergeList(globalAdmins); notify.admins(); break;
    case 'settings': globalSettings[newRow.key] = newRow.value; notify.settings(); break;
    case 'monthly_summaries': globalSummaries = mergeList(globalSummaries).sort((a,b) => b.year - a.year || b.month - a.month); notify.summaries(); break;
  }
};

const fetchers = {
  products: async () => {
    const { data } = await supabase.from('products').select('*').eq('is_available', true).order('name');
    if (data) { globalProducts = data; notify.products(); }
  },
  archived: async () => {
    const { data } = await supabase.from('products').select('*').eq('is_available', false).order('name');
    if (data) { globalArchived = data; notify.archived(); }
  },
  orders: async () => {
    const { data } = await supabase.from('orders').select('*').order('date', { ascending: false });
    if (data) { globalOrders = data; notify.orders(); }
  },
  expenses: async () => {
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (data) { globalExpenses = data; notify.expenses(); }
  },
  requests: async () => {
    const { data } = await supabase.from('product_requests').select('*').order('created_at', { ascending: false });
    if (data) { globalRequests = data; notify.requests(); }
  },
  reviews: async () => {
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (data) { globalReviews = data; notify.reviews(); }
  },
  admins: async () => {
    const { data } = await supabase.from('admins').select('id, username, created_at').order('created_at');
    if (data) { globalAdmins = data; notify.admins(); }
  },
  settings: async () => {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(s => map[s.key] = s.value);
      globalSettings = map; notify.settings();
    }
  },
  summaries: async () => {
    const { data } = await supabase.from('monthly_summaries').select('*').order('year', { ascending: false }).order('month', { ascending: false });
    if (data) { globalSummaries = data; notify.summaries(); }
  }
};

let isInit = false;
const initRT = () => {
  if (isInit) return; isInit = true;
  const channel = supabase.channel('instant_pulse_x');
  const tables = ['products', 'orders', 'expenses', 'product_requests', 'reviews', 'admins', 'settings', 'monthly_summaries'];
  tables.forEach(table => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      patchState(table, payload);
    });
  });
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
       console.log('🟢 Zero-Latency Sync Active');
       Object.values(fetchers).forEach(f => f());
    }
    if (status === 'CHANNEL_ERROR') { isInit = false; setTimeout(initRT, 3000); }
  });
};

initRT();

// ── OPTIMISTIC HOOKS ──

export function useProducts() {
  const [products, setP] = useState(globalProducts);
  const [archivedProducts, setA] = useState(globalArchived);
  useEffect(() => {
    listeners.products.add(setP); listeners.archived.add(setA);
    setP([...globalProducts]); setA([...globalArchived]);
    return () => { listeners.products.delete(setP); listeners.archived.delete(setA); };
  }, []);

  return {
    products, archivedProducts, loading: false,
    addProduct: useCallback(async (n: any, p: any, s: any, i: any) => {
      const { data, error } = await supabase.from('products').insert([{ name: n, price: p, stock: s, image: i, is_available: true }]).select();
      if (!error && data) { patchState('products', { eventType: 'INSERT', new: data[0] }); toast.success('Product added!'); }
      else if (error) toast.error(error.message);
    }, []),
    removeProduct: useCallback(async (id: any) => {
      const target = globalProducts.find(p => p.id === id);
      if (target) { patchState('products', { eventType: 'UPDATE', new: { ...target, is_available: false } }); toast.success('Archived!'); }
      await supabase.from('products').update({ is_available: false }).eq('id', id);
    }, []),
    restoreProduct: useCallback(async (id: any) => {
      const target = globalArchived.find(p => p.id === id);
      if (target) { patchState('products', { eventType: 'UPDATE', new: { ...target, is_available: true } }); toast.success('Restored!'); }
      await supabase.from('products').update({ is_available: true }).eq('id', id);
    }, []),
    updateProduct: useCallback(async (id: any, n: any, p: any, s: any, i: any) => {
      const { data, error } = await supabase.from('products').update({ name: n, price: p, stock: s, image: i }).eq('id', id).select();
      if (!error && data) { patchState('products', { eventType: 'UPDATE', new: data[0] }); toast.success('Updated!'); }
    }, []),
    deductStock: useCallback(async (id: any, q: any) => {
       await supabase.rpc('deduct_stock', { p_id: id, q: q });
       // The RT event will handle the UI update
    }, [])
  };
}

export function useOrders() {
  const [orders, setO] = useState(globalOrders);
  useEffect(() => { listeners.orders.add(setO); setO([...globalOrders]); return () => { listeners.orders.delete(setO); }; }, []);
  return {
    orders,
    addOrder: useCallback(async (o: any) => {
      const { data, error } = await supabase.from('orders').insert([o]).select();
      if (!error && data) { patchState('orders', { eventType: 'INSERT', new: data[0] }); toast.success('Order placed!'); }
    }, []),
    removeOrder: useCallback(async (id: any) => {
      patchState('orders', { eventType: 'DELETE', old: { id } });
      await supabase.from('orders').delete().eq('id', id);
    }, []),
    toggleStatus: useCallback(async (id: any) => {
      const target = globalOrders.find(o => o.id === id);
      if (target) {
        const next = target.status === 'paid' ? 'unpaid' : 'paid';
        const { data, error } = await supabase.from('orders').update({ status: next }).eq('id', id).select();
        if (!error && data) patchState('orders', { eventType: 'UPDATE', new: data[0] });
      }
    }, [])
  };
}

export function useExpenses() {
  const [expenses, setE] = useState(globalExpenses);
  useEffect(() => { listeners.expenses.add(setE); setE([...globalExpenses]); return () => { listeners.expenses.delete(setE); }; }, []);
  return {
    expenses,
    addExpense: useCallback(async (e: any) => {
      const { data, error } = await supabase.from('expenses').insert([e]).select();
      if (!error && data) { patchState('expenses', { eventType: 'INSERT', new: data[0] }); toast.success('Recorded!'); }
    }, []),
    removeExpense: useCallback(async (id: any) => {
      patchState('expenses', { eventType: 'DELETE', old: { id } });
      await supabase.from('expenses').delete().eq('id', id);
    }, [])
  };
}

// ... All other hooks follow this same reactive pattern ...
export function useProductRequests() {
  const [requests, setR] = useState(globalRequests);
  useEffect(() => { listeners.requests.add(setR); setR([...globalRequests]); return () => { listeners.requests.delete(setR); }; }, []);
  return { requests, loading: false, updateRequestStatus: useCallback(async (id: any, status: any) => { const { data, error } = await supabase.from('product_requests').update({ status }).eq('id', id).select(); if (!error && data) patchState('product_requests', { eventType: 'UPDATE', new: data[0] }); }, []), deleteRequest: useCallback(async (id: any) => { patchState('product_requests', { eventType: 'DELETE', old: { id } }); await supabase.from('product_requests').delete().eq('id', id); }, []), clearRequestsByStatus: useCallback(async (status: any) => { await supabase.from('product_requests').delete().eq('status', status); fetchers.requests(); }, []) };
}

export function useReviews(productId?: string) {
  const [reviews, setR] = useState(globalReviews);
  useEffect(() => { listeners.reviews.add(setR); setR([...globalReviews]); return () => { listeners.reviews.delete(setR); }; }, []);
  return { reviews: productId ? reviews.filter(r => r.product_id === productId) : reviews, loading: false, addReview: useCallback(async (p_id: any, tele_id: any, name: any, rating: any, comment: any, user: any) => { const { data, error } = await supabase.from('reviews').insert([{ product_id: p_id, telegram_id: tele_id, first_name: name, rating, comment, username: user }]).select(); if (!error && data) { patchState('reviews', { eventType: 'INSERT', new: data[0] }); toast.success('Review added!'); return true; } return false; }, []), deleteReview: useCallback(async (id: any) => { patchState('reviews', { eventType: 'DELETE', old: { id } }); await supabase.from('reviews').delete().eq('id', id); }, []) };
}

export function useSettings() {
  const [settings, setS] = useState(globalSettings);
  useEffect(() => { listeners.settings.add(setS); setS({ ...globalSettings }); return () => { listeners.settings.delete(setS); }; }, []);
  return { settings, updateSetting: useCallback(async (key: string, value: string) => { const { data, error } = await supabase.from('settings').upsert({ key, value }).select(); if (!error && data) { patchState('settings', { eventType: 'UPDATE', new: data[0] }); toast.success('Settings updated!'); } }, []) };
}

export function useAdmins() {
  const [admins, setA] = useState(globalAdmins);
  useEffect(() => { listeners.admins.add(setA); setA([...globalAdmins]); return () => { listeners.admins.delete(setA); }; }, []);
  return { admins, addAdmin: useCallback(async (username: any, password: any) => { const { data, error } = await supabase.from('admins').insert([{ username, password }]).select(); if (!error && data) { patchState('admins', { eventType: 'INSERT', new: data[0] }); toast.success('Admin added!'); return true; } return false; }, []), updateAdmin: useCallback(async (id: any, username: any, password: any) => { const updates: any = { username }; if (password) updates.password = password; const { data, error } = await supabase.from('admins').update(updates).eq('id', id).select(); if (!error && data) { patchState('admins', { eventType: 'UPDATE', new: data[0] }); toast.success('Admin updated!'); return true; } return false; }, []), deleteAdmin: useCallback(async (id: any) => { patchState('admins', { eventType: 'DELETE', old: { id } }); await supabase.from('admins').delete().eq('id', id); }, []) };
}

export function useMonthlySummaries() {
  const [summaries, setS] = useState(globalSummaries);
  useEffect(() => { listeners.summaries.add(setS); setS([...globalSummaries]); return () => { listeners.summaries.delete(setS); }; }, []);
  return { summaries, loading: false, saveSnapshot: useCallback(async (data: any) => { const { data: res, error } = await supabase.from('monthly_summaries').upsert(data).select(); if (!error && res) { patchState('monthly_summaries', { eventType: 'UPDATE', new: res[0] }); toast.success('Snapshot saved!'); } }, []) };
}
