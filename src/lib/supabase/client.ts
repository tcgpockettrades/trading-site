import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { type Database } from '@/app/types'; // Adjust this path as needed

// Client-side Supabase client (for use in Client Components)
export const createClient = () => {
  return createClientComponentClient<Database>();
};