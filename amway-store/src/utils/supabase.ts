import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseUrl.startsWith('http') &&
    supabaseKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseKey.includes('your-key')
);

const createMockClient = () => {
  const chainable = () => ({
    select: () => chainable(),
    insert: async () => ({ error: { message: 'Supabase not configured' }, data: null }),
    upsert: async () => ({ error: { message: 'Supabase not configured' }, data: null }),
    update: () => chainable(),
    delete: () => chainable(),
    eq: () => chainable(),
    neq: () => chainable(),
    order: () => chainable(),
    limit: () => chainable(),
    single: async () => ({ error: { message: 'Supabase not configured' }, data: null }),
    then: (resolve: any) => resolve({ error: { message: 'Supabase not configured' }, data: null }),
  });

  return {
    from: () => chainable(),
  } as unknown as SupabaseClient;
};

// Main client for app operations
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })
  : createMockClient();

// Dedicated admin client (uses service role if available for server writes)
export const getSupabaseAdmin = (): SupabaseClient => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
  if (isSupabaseConfigured && serviceKey) {
    return createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
  }
  return supabase;
};
