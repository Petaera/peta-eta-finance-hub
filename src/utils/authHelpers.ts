import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Creates a user profile in your application's profiles table
 * This runs after a user signs up and should be called via a database trigger
 * or directly from your AuthContext
 */
export const createUserProfile = async (user: User, additionalData?: any) => {
  try {
    const profileData = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || additionalData?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...additionalData
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error('Error creating user profile:', err);
    return { error: err };
  }
};

/**
 * Updates user profile data
 */
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error('Error updating user profile:', err);
    return { error: err };
  }
};

/**
 * Gets user profile data
 */
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting user profile:', error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error('Error getting user profile:', err);
    return { error: err };
  }
};

/**
 * Updates user metadata in Supabase auth.users table
 */
export const updateUserMetadata = async (updates: any) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) {
      console.error('Error updating user metadata:', error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error('Error updating user metadata:', err);
    return { error: err };
  }
};
