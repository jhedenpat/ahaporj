import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data: p } = await supabase.from('products').select('name, is_available, stock');
    const { data: r } = await supabase.from('product_requests').select('product_name');
    console.log('PRODUCTS:', JSON.stringify(p, null, 2));
    console.log('REQUESTS:', JSON.stringify(r, null, 2));
}

check();
