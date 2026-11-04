import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Gracefully mock the client if keys are fake to prevent API route crashes
export const supabase = (supabaseUrl && supabaseUrl.startsWith('http')) 
  ? createClient(supabaseUrl, supabaseKey) 
  : {
      from: () => ({
        select: async () => ({ error: { message: "Mock" }, data: null }),
        insert: async () => ({ error: { message: "Mock" }, data: null }),
        delete: () => ({ eq: async () => ({ error: null, data: null }) })
      })
    } as any;
