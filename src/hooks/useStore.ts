import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Order, Expense, ProductRequest, Review } from '@/types';
import { toast } from 'sonner';

// ── TYPES (Locally defined for build stability) ──
export interface Admin {
  id: string;
  username: string;
  created_at: string;
}

export interface MonthlySummary {
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
  updated_at: string;
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

// ── NOTIFIERS ──
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

// ── FETCHERS ──
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
      globalSettings = map;
      notify.settings();
    }
  },
  summaries: async () => {
    const { data } = await supabase.from('monthly_summaries').select('*').order('year', { ascending: false }).order('month', { ascending: false });
    if (data) { globalSummaries = data; notify.summaries(); }
  }
};

// ── REALTIME ──
let isInit = false;
const initRT = () => {
  if (isInit) return; isInit = true;
  console.log('⚡ Singleton Realtime Core Active');
  
  const tables = ['products', 'orders', 'expenses', 'product_requests', 'reviews', 'admins', 'settings', 'monthly_summaries'];
  tables.forEach(table => {
    supabase.channel(`global-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        if (table === 'products') { fetchers.products(); fetchers.archived(); }
        else if (table === 'product_requests') fetchers.requests();
        else if (table === 'monthly_summaries') fetchers.summaries();
        else (fetchers as any)[table?.replace('product_', '') || table]();
      })
      .subscribe();
  });
};

// Initial load
Object.values(fetchers).forEach(f => f());
initRT();

// ── CONSUMER HOOKS ──

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
    addProduct: (n: any, p: any, s: any, i: any) => supabase.from('products').insert([{ name: n, price: p, stock: s, image: i, is_available: true }]),
    removeProduct: (id: any) => supabase.from('products').update({ is_available: false }).eq('id', id),
    restoreProduct: (id: any) => supabase.from('products').update({ is_available: true }).eq('id', id),
    updateProduct: (id: any, n: any, p: any, s: any, i: any) => supabase.from('products').update({ name: n, price: p, stock: s, image: i }).eq('id', id),
    deductStock: (id: any, q: any) => supabase.rpc('deduct_stock', { p_id: id, q: q })
  };
}

export function useOrders() {
  const [orders, setO] = useState(globalOrders);
  useEffect(() => {
    listeners.orders.add(setO); setO([...globalOrders]);
    return () => { listeners.orders.delete(setO); };
  }, []);

  return {
    orders,
    addOrder: (o: any) => supabase.from('orders').insert([o]),
    removeOrder: (id: any) => supabase.from('orders').delete().eq('id', id),
    toggleStatus: async (id: any) => {
      const target = globalOrders.find(o => o.id === id);
      if (target) await supabase.from('orders').update({ status: target.status === 'paid' ? 'unpaid' : 'paid' }).eq('id', id);
    }
  };
}

export function useExpenses() {
  const [expenses, setE] = useState(globalExpenses);
  useEffect(() => {
    listeners.expenses.add(setE); setE([...globalExpenses]);
    return () => { listeners.expenses.delete(setE); };
  }, []);
  return {
    expenses,
    addExpense: (e: any) => supabase.from('expenses').insert([e]),
    removeExpense: (id: any) => supabase.from('expenses').delete().eq('id', id)
  };
}

export function useProductRequests() {
  const [requests, setR] = useState(globalRequests);
  useEffect(() => {
    listeners.requests.add(setR); setR([...globalRequests]);
    return () => { listeners.requests.delete(setR); };
  }, []);
  return {
    requests, loading: false,
    updateRequestStatus: (id: any, status: any) => supabase.from('product_requests').update({ status }).eq('id', id),
    deleteRequest: (id: any) => supabase.from('product_requests').delete().eq('id', id),
    clearRequestsByStatus: (status: any) => supabase.from('product_requests').delete().eq('status', status)
  };
}

export function useReviews(productId?: string) {
  const [reviews, setR] = useState(globalReviews);
  useEffect(() => {
    listeners.reviews.add(setR); setR([...globalReviews]);
    return () => { listeners.reviews.delete(setR); };
  }, []);
  return {
    reviews: productId ? reviews.filter(r => r.product_id === productId) : reviews,
    loading: false,
    addReview: async (p_id: any, tele_id: any, name: any, rating: any, comment: any, user: any) => {
      const { error } = await supabase.from('reviews').insert([{ product_id: p_id, telegram_id: tele_id, first_name: name, rating, comment, username: user }]);
      if (error) return false; toast.success('Review added!'); return true;
    },
    deleteReview: (id: any) => supabase.from('reviews').delete().eq('id', id)
  };
}

export function useSettings() {
  const [settings, setS] = useState(globalSettings);
  useEffect(() => {
    listeners.settings.add(setS); setS({ ...globalSettings });
    return () => { listeners.settings.delete(setS); };
  }, []);
  return {
    settings,
    updateSetting: async (key: string, value: string) => {
      await supabase.from('settings').upsert({ key, value });
      toast.success('Settings updated!');
    }
  };
}

export function useAdmins() {
  const [admins, setA] = useState(globalAdmins);
  useEffect(() => {
    listeners.admins.add(setA); setA([...globalAdmins]);
    return () => { listeners.admins.delete(setA); };
  }, []);
  return {
    admins,
    addAdmin: async (username: any, password: any) => {
      const { error } = await supabase.from('admins').insert([{ username, password }]);
      if (error) { toast.error(error.message); return false; }
      toast.success('Admin added!'); return true;
    },
    updateAdmin: async (id: any, username: any, password: any) => {
      const updates: any = { username };
      if (password) updates.password = password;
      const { error } = await supabase.from('admins').update(updates).eq('id', id);
      if (error) { toast.error(error.message); return false; }
      toast.success('Admin updated!'); return true;
    },
    deleteAdmin: (id: any) => supabase.from('admins').delete().eq('id', id)
  };
}

export function useMonthlySummaries() {
  const [summaries, setS] = useState(globalSummaries);
  useEffect(() => {
    listeners.summaries.add(setS); setS([...globalSummaries]);
    return () => { listeners.summaries.delete(setS); };
  }, []);
  return {
    summaries, loading: false,
    saveSnapshot: async (data: any) => {
      const { error } = await supabase.from('monthly_summaries').upsert(data);
      if (error) toast.error(error.message); else toast.success('Snapshot saved!');
    }
  };
}
