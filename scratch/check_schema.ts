import { createClient } from '@supabase/supabase-client'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function checkSchema() {
  const { data, error } = await supabase.from('orders').select('*').limit(1)
  if (error) {
    console.error('Error fetching order:', error)
  } else {
    console.log('Order keys:', Object.keys(data[0] || {}))
  }
}

checkSchema()
