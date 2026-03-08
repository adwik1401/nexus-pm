import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable the Web Lock on the auth token — prevents the 5s lock timeout
    // warning that occurs when multiple dev server tabs compete for the same lock.
    // Safe to disable here since we use a module-level singleton client.
    // No-op lock: disables the Web Lock API used by Supabase to serialize auth token
    // access. The default lock causes a 5s timeout warning when multiple dev server
    // tabs are open. Safe to disable since we use a module-level singleton client.
    lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn(),
  },
})
