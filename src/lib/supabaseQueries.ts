import {supabase} from './supabase';
import type { User } from '../types';

// Check if current user is admin
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }

    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Get current user's role
export const getCurrentUserRole = async (): Promise<string | null> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return profile?.role || 'user';
  } catch (error) {
    console.error('Error in getCurrentUserRole:', error);
    return null;
  }
};

// Create a new user account
export const createUserAccount = async (
  email: string, 
  password: string, 
  fullName: string, 
  role: 'admin' | 'user' = 'user'
): Promise<{ success: boolean; error?: string; user?: any }> => {
  try {
    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Only admins can create user accounts' };
    }

    // Store current session to restore later
    const { data: currentSession } = await supabase.auth.getSession();
    
    // Create user using regular signup (this will work with anon key)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'User creation failed - no user returned' };
    }

    // Wait a moment for the profile to be created by the trigger
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update the user's role in the profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', data.user.id);

    if (updateError) {
      console.error('Error updating user role:', updateError);
      // Don't return error here, user was created successfully
    }

    // Sign out the newly created user to avoid session conflicts
    if (data.session) {
      await supabase.auth.signOut();
    }

    // Restore the original admin session
    if (currentSession.session) {
      await supabase.auth.setSession(currentSession.session);
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Error in createUserAccount:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export const fetchUsersFromProfiles = async (): Promise<User[]> => {
  try {
    // First check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('Current user:', user.email);
    console.log('User metadata:', user.app_metadata);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error details:', error);
      throw error;
    }

    console.log('Fetched profiles:', data);

    // Transform profiles data to User type
    return data.map((profile: any) => ({
      id: profile.id,
      email: profile.email || '',
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      last_sign_in_at: profile.last_sign_in_at,
      user_metadata: {
        full_name: profile.full_name,
        avatar_url: profile.avatar_url
      },
      app_metadata: {
        role: profile.role
      }
    }));
  } catch (error) {
    console.error('Error fetching users from profiles:', error);
    throw error;
  }
};

// Update user profile information
export const updateUserProfile = async (updates: {
  fullName?: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Update user metadata (full name)
    if (updates.fullName !== undefined) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name: updates.fullName }
      });
      
      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        return { success: false, error: metadataError.message };
      }

      // Also update the full_name in the profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: updates.fullName })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile full_name:', profileError);
        return { success: false, error: profileError.message };
      }
    }

    // Update email if provided
    if (updates.email !== undefined && updates.email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: updates.email
      });
      
      if (emailError) {
        console.error('Error updating email:', emailError);
        return { success: false, error: emailError.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: 'Failed to update profile' };
  }
};

// Change user password
export const changeUserPassword = async (
  currentPassword: string, 
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // First verify the current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (verifyError) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: 'Failed to change password' };
  }
};

// Update user role (admin only)
export const updateUserRole = async (
  userId: string,
  newRole: 'admin' | 'user'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Only admins can update user roles' };
    }

    // Update the user's role in the profiles table
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    return { success: false, error: 'Failed to update user role' };
  }
};