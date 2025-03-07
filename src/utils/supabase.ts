
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fake-url-replace-with-real-one.supabase.co';
const supabaseAnonKey = 'fake-key-replace-with-real-one';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables
export type Profile = {
  id: string;
  name: string | null;
  age: number | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  physical_issues: string | null;
  contact_number: string | null;
  created_at: string;
  updated_at: string;
};

export type Reminder = {
  id: string;
  user_id: string;
  medicine_name: string;
  dosage: string | null;
  frequency: string;
  time: string;
  notes: string | null;
  created_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};
