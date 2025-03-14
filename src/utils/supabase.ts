
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ygwlozprixmmnatxwwfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnd2xvenByaXhtbW5hdHh3d2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzNjc2MTYsImV4cCI6MjA1Njk0MzYxNn0.UQyEOEXXkPEDdSUlOTyo0Qm2mmh1NtHGZeWSPMP9crE';

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
  theme_preference?: string;
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
  image_url?: string | null;
  updated_at?: string | null;
};

export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  image_urls?: string;
};

// Function to persist theme preference to the profile
export const saveThemePreference = async (userId: string, theme: string) => {
  if (!userId) return;
  
  try {
    console.log(`Saving theme preference "${theme}" for user ${userId}`);
    const { error } = await supabase
      .from('profiles')
      .update({ theme_preference: theme })
      .eq('id', userId);
      
    if (error) throw error;
    
    // Also save to localStorage as a backup
    localStorage.setItem('theme-preference', theme);
    
    return true;
  } catch (error) {
    console.error('Error saving theme preference:', error);
    return false;
  }
};

// Function to retrieve theme preference from profile
export const getThemePreference = async (userId: string): Promise<string | null> => {
  if (!userId) return null;
  
  try {
    // First check if we have a theme preference in localStorage
    const localTheme = localStorage.getItem('theme-preference');
    
    // Then check in the database
    const { data, error } = await supabase
      .from('profiles')
      .select('theme_preference')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    
    // Update localStorage if we got a theme from the database
    if (data?.theme_preference) {
      localStorage.setItem('theme-preference', data.theme_preference);
    }
    
    return data?.theme_preference || localTheme || null;
  } catch (error) {
    console.error('Error getting theme preference:', error);
    // Fall back to localStorage if the database query fails
    return localStorage.getItem('theme-preference');
  }
};
