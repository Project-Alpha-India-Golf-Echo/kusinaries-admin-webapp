import type { ActivityLog, User, UserRole } from '../types';
import { getSignedUrls, toObjectPath } from './storageUtils';
import { supabase } from './supabase';

// Check if current user is admi
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
  role: UserRole = 'user'
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
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      console.warn('Non-admin user attempted to update user role');
      return { success: false, error: 'Only admins can update user roles' };
    }

    // Validate userId and role
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    
    if (!['admin', 'user', 'cook', 'family_head'].includes(newRole)) {
      return { success: false, error: 'Invalid role specified' };
    }

    console.log(`Attempting to update user ${userId} role to ${newRole}`);

    // Update the user's role in the profiles table
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, role');

    if (error) {
      console.error('Supabase error updating user role:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return { success: false, error: `Database error: ${error.message}` };
    }

    if (!data || data.length === 0) {
      console.warn(`No user found with ID: ${userId}`);
      return { success: false, error: 'User not found' };
    }

    console.log(`Successfully updated user ${userId} role to ${newRole}`);
    return { success: true };
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    return { success: false, error: 'Failed to update user role' };
  }
};

// Admin: update another user's account details (full name, email, role)
export const updateUserAccount = async (
  userId: string,
  updates: { fullName?: string; email?: string; role?: UserRole }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) return { success: false, error: 'Only admins can update users' };
    if (!userId) return { success: false, error: 'User ID required' };

    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.fullName !== undefined) payload.full_name = updates.fullName;
    if (updates.role) payload.role = updates.role;
    if (updates.email !== undefined) payload.email = updates.email; // assumes column exists in profiles

    if (Object.keys(payload).length === 1) {
      return { success: true }; // nothing to update besides timestamp
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user account (admin):', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    console.error('Unexpected error in updateUserAccount:', e);
    return { success: false, error: 'Failed to update user' };
  }
};

// Scalable user fetch with pagination, filtering, searching
export const fetchUsers = async (params: {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole | 'all';
  orderBy?: 'created_at' | 'last_sign_in_at';
  orderDir?: 'asc' | 'desc';
} = {}): Promise<{ success: boolean; users?: User[]; total?: number; error?: string; hasMore?: boolean }> => {
  const {
    page = 1,
    pageSize = 25,
    search,
    role = 'all',
    orderBy = 'created_at',
    orderDir = 'desc'
  } = params;
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order(orderBy, { ascending: orderDir === 'asc' })
      .range(from, to);

    if (role !== 'all') {
      query = query.eq('role', role);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      // Supabase or filter across columns
      query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('Error fetching users (paginated):', error);
      return { success: false, error: error.message };
    }
    const users: User[] = (data || []).map((profile: any) => ({
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
        role: profile.role as UserRole
      }
    }));
    const total = count || 0;
    const hasMore = to + 1 < total;
    return { success: true, users, total, hasMore };
  } catch (err) {
    console.error('Unexpected error in fetchUsers:', err);
    return { success: false, error: 'Failed to fetch users' };
  }
};

// ============================================
// MEAL CURATION SYSTEM QUERIES
// ============================================

import type {
    CreateMealData,
    DietaryTag,
    Ingredient,
    IngredientCategory,
    Meal
} from '../types';

// ===== INGREDIENT QUERIES =====

// Get all ingredients (only active/non-archived by default)
export const getAllIngredients = async (): Promise<{ success: boolean; data?: Ingredient[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('is_disabled', false)
      .order('name');

    if (error) {
      console.error('Error fetching ingredients:', error);
      return { success: false, error: error.message };
    }

    // Attach signed URLs for private storage
    const keys = (data || [])
      .map((i: any) => i.image_url)
      .filter(Boolean)
      .map((u: string) => toObjectPath(u));
    const signedMap = await getSignedUrls(keys);
    const enriched = (data || []).map((i: any) => ({
      ...i,
      signed_image_url: i.image_url ? signedMap[toObjectPath(i.image_url)] : undefined,
    }));

    return { success: true, data: enriched };
  } catch (error) {
    console.error('Error in getAllIngredients:', error);
    return { success: false, error: 'Failed to fetch ingredients' };
  }
};

// Get ingredients by category (only active/non-archived by default)
export const getIngredientsByCategory = async (category: IngredientCategory, glowSubcategory?: 'Vegetables' | 'Fruits'): Promise<{ success: boolean; data?: Ingredient[]; error?: string }> => {
  try {
    let query = supabase
      .from('ingredients')
      .select('*')
      .eq('category', category)
      .eq('is_disabled', false);

    if (category === 'Glow' && glowSubcategory) {
      query = query.eq('glow_subcategory', glowSubcategory);
    }

    const { data, error } = await query.order('name');

    if (error) {
      console.error('Error fetching ingredients by category:', error);
      return { success: false, error: error.message };
    }

    const keys = (data || [])
      .map((i: any) => i.image_url)
      .filter(Boolean)
      .map((u: string) => toObjectPath(u));
    const signedMap = await getSignedUrls(keys);
    const enriched = (data || []).map((i: any) => ({
      ...i,
      signed_image_url: i.image_url ? signedMap[toObjectPath(i.image_url)] : undefined,
    }));
    return { success: true, data: enriched };
  } catch (error) {
    console.error('Error in getIngredientsByCategory:', error);
    return { success: false, error: 'Failed to fetch ingredients by category' };
  }
};

// Create a new ingredient
export const createIngredient = async (ingredientData: {
  name: string;
  category: IngredientCategory;
  glow_subcategory?: 'Vegetables' | 'Fruits' | null;
  image_url?: string;
  price_per_kilo: number;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .insert([
        {
          name: ingredientData.name,
          category: ingredientData.category,
          glow_subcategory: ingredientData.category === 'Glow' ? ingredientData.glow_subcategory : null,
          image_url: ingredientData.image_url,
          price_per_kilo: ingredientData.price_per_kilo,
          created_at: new Date().toISOString()
        }
      ])
      .select('ingredient_id, name')
      .single();

    if (error) {
      console.error('Error creating ingredient:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'ingredient',
        data.ingredient_id,
        data.name,
        'created',
        { category: ingredientData.category, price_per_kilo: ingredientData.price_per_kilo }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createIngredient:', error);
    return { success: false, error: 'Failed to create ingredient' };
  }
};

// Update an existing ingredient
export const updateIngredient = async (id: number, ingredientData: {
  name?: string;
  category?: IngredientCategory;
  glow_subcategory?: 'Vegetables' | 'Fruits' | null;
  image_url?: string;
  price_per_kilo?: number;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    // Normalize glow_subcategory: only keep if category is Glow (if provided)
    const updatePayload: any = { ...ingredientData };
    if (updatePayload.category && updatePayload.category !== 'Glow') {
      updatePayload.glow_subcategory = null;
    }
    const { data, error } = await supabase
      .from('ingredients')
      .update(updatePayload)
      .eq('ingredient_id', id)
      .select('ingredient_id, name')
      .single();

    if (error) {
      console.error('Error updating ingredient:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'ingredient',
        data.ingredient_id,
        data.name,
        'updated',
        ingredientData
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateIngredient:', error);
    return { success: false, error: 'Failed to update ingredient' };
  }
};

// Archive an ingredient (soft delete)
export const archiveIngredient = async (id: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .update({ is_disabled: true })
      .eq('ingredient_id', id)
      .select('ingredient_id, name')
      .single();

    if (error) {
      console.error('Error archiving ingredient:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'ingredient',
        data.ingredient_id,
        data.name,
        'archived'
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in archiveIngredient:', error);
    return { success: false, error: 'Failed to archive ingredient' };
  }
};

// Restore an archived ingredient
export const restoreIngredient = async (id: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .update({ is_disabled: false })
      .eq('ingredient_id', id)
      .select('ingredient_id, name')
      .single();

    if (error) {
      console.error('Error restoring ingredient:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'ingredient',
        data.ingredient_id,
        data.name,
        'restored'
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in restoreIngredient:', error);
    return { success: false, error: 'Failed to restore ingredient' };
  }
};

// Get archived ingredients
export const getArchivedIngredients = async (): Promise<{ success: boolean; data?: Ingredient[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('is_disabled', true)
      .order('name');

    if (error) {
      console.error('Error fetching archived ingredients:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getArchivedIngredients:', error);
    return { success: false, error: 'Failed to fetch archived ingredients' };
  }
};

// ===== MEAL QUERIES =====

// Get all meals
export const getAllMeals = async (): Promise<{ success: boolean; data?: Meal[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        *,
        meal_ingredients(
          *,
          ingredients(*)
        ),
        dietary_tags:meal_dietary_tags(
          *,
          dietary_tag:dietary_tags(*)
        ),
        meal_condiments(
          *,
          condiments(*)
        )
      `)
      .eq('is_disabled', false) // Only get active (non-archived) meals
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching meals:', error);
      return { success: false, error: error.message };
    }
    // Sign image URLs
    const keys = (data || [])
      .map((m: any) => m.image_url)
      .filter(Boolean)
      .map((u: string) => toObjectPath(u));
    const signedMap = await getSignedUrls(keys);
    const enriched = (data || []).map((m: any) => ({
      ...m,
      signed_image_url: m.image_url ? signedMap[toObjectPath(m.image_url)] : undefined,
    }));

    return { success: true, data: enriched };
  } catch (error) {
    console.error('Error in getAllMeals:', error);
    return { success: false, error: 'Failed to fetch meals' };
  }
};

// Get meal by ID
export const getMealById = async (id: string): Promise<{ success: boolean; data?: Meal; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        *,
        ingredients:meal_ingredients(
          *,
          ingredient:ingredients(
            name
          )
        ),
        dietary_tags:meal_dietary_tags(
          *,
          dietary_tag:dietary_tags(
            name
          )
        ),
        meal_condiments(
          *,
          condiments(*)
        )
      `)
      .eq('meal_id', id)
      .single();

    if (error) {
      console.error('Error fetching meal by ID:', error);
      return { success: false, error: error.message };
    }

    if (data?.image_url) {
      const signedMap = await getSignedUrls([toObjectPath(data.image_url)]);
      (data as any).signed_image_url = signedMap[toObjectPath(data.image_url)];
    }
    return { success: true, data: data as any };
  } catch (error) {
    console.error('Error in getMealById:', error);
    return { success: false, error: 'Failed to fetch meal' };
  }
};

// Create a new meal
export const createMeal = async (mealData: CreateMealData): Promise<{ success: boolean; error?: string }> => {
  try {
    // Step 1: Insert meal
    const { data: mealInsert, error: mealError } = await supabase
      .from('meals')
      .insert([
        {
          name: mealData.name,
          category: mealData.category,
            recipe: mealData.recipe,
          image_url: mealData.image_url,
          is_disabled: false,
          ai_generated: mealData.ai_generated ?? false,
          ai_batch_id: mealData.ai_batch_id ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select('meal_id, name')
      .single();

    if (mealError || !mealInsert) {
      console.error('Error creating meal:', mealError);
      return { success: false, error: mealError?.message || 'Failed to create meal' };
    }

    const mealId = mealInsert.meal_id;

    // Step 2: Insert ingredients if any
    if (mealData.ingredients && mealData.ingredients.length > 0) {
      const ingredientRows = mealData.ingredients.map(i => ({
        meal_id: mealId,
        ingredient_id: i.ingredient_id,
        quantity: i.quantity
      }));
      const { error: ingError } = await supabase
        .from('meal_ingredients')
        .insert(ingredientRows);
      if (ingError) {
        console.error('Error inserting meal ingredients:', ingError);
        return { success: false, error: 'Meal created but failed to attach ingredients' };
      }
    }

    // Step 3: Insert condiments if any
    if (mealData.condiments && mealData.condiments.length > 0) {
      const condimentRows = mealData.condiments.map(c => ({
        meal_id: mealId,
        condiment_id: c.condiment_id,
        quantity: c.quantity
      }));
      const { error: condError } = await supabase
        .from('meal_condiments')
        .insert(condimentRows);
      if (condError) {
        console.error('Error inserting meal condiments:', condError);
        return { success: false, error: 'Meal created but failed to attach condiments' };
      }
    }

    // Step 4: Insert dietary tags if any
    if (mealData.dietary_tag_ids && mealData.dietary_tag_ids.length > 0) {
      const tagRows = mealData.dietary_tag_ids.map(tagId => ({
        meal_id: mealId,
        tag_id: tagId
      }));
      const { error: tagError } = await supabase
        .from('meal_dietary_tags')
        .insert(tagRows);
      if (tagError) {
        console.error('Error inserting meal dietary tags:', tagError);
        return { success: false, error: 'Meal created but failed to attach dietary tags' };
      }
    }

    // Step 5: Log activity
    await createActivityLogEntry(
      'meal',
      mealId,
      mealInsert.name,
      'created',
      { category: mealData.category, recipe: mealData.recipe }
    );

    return { success: true };
  } catch (error) {
    console.error('Error in createMeal:', error);
    return { success: false, error: 'Failed to create meal' };
  }
};

// Delete all AI generated meals (optionally by batch id)
export const deleteAiMeals = async (batchId?: string): Promise<{ success: boolean; error?: string; deleted?: number }> => {
  try {
    // Fetch meal ids to delete
    let query = supabase.from('meals').select('meal_id').eq('ai_generated', true);
    if (batchId) {
      query = query.eq('ai_batch_id', batchId);
    }
    const { data: meals, error: fetchErr } = await query;
    if (fetchErr) return { success: false, error: fetchErr.message };
    const mealIds = (meals || []).map(m => m.meal_id);
    if (mealIds.length === 0) return { success: true, deleted: 0 };

    // Delete child rows first
    const { error: delTags } = await supabase.from('meal_dietary_tags').delete().in('meal_id', mealIds);
    if (delTags) return { success: false, error: delTags.message };
    const { error: delIngs } = await supabase.from('meal_ingredients').delete().in('meal_id', mealIds);
    if (delIngs) return { success: false, error: delIngs.message };
    const { error: delMeals } = await supabase.from('meals').delete().in('meal_id', mealIds);
    if (delMeals) return { success: false, error: delMeals.message };
    return { success: true, deleted: mealIds.length };
  } catch (e: any) {
    return { success: false, error: 'Failed to delete AI meals' };
  }
};

// Update an existing meal
export const updateMeal = async (id: string, mealData: Partial<CreateMealData>): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .update({
        name: mealData.name,
        category: mealData.category,
        recipe: mealData.recipe,
        image_url: mealData.image_url,
        updated_at: new Date().toISOString()
      })
      .eq('meal_id', id)
      .select('meal_id, name')
      .single();

    if (error) {
      console.error('Error updating meal:', error);
      return { success: false, error: error.message };
    }

    // Replace ingredients if provided
    if (mealData.ingredients) {
      const { error: delIng } = await supabase.from('meal_ingredients').delete().eq('meal_id', id);
      if (delIng) {
        console.error('Error clearing existing meal ingredients:', delIng);
        return { success: false, error: 'Failed to update meal ingredients' };
      }
      if (mealData.ingredients.length > 0) {
        const rows = mealData.ingredients.map(i => ({ meal_id: id, ingredient_id: i.ingredient_id, quantity: i.quantity }));
        const { error: insIng } = await supabase.from('meal_ingredients').insert(rows);
        if (insIng) {
          console.error('Error inserting updated meal ingredients:', insIng);
          return { success: false, error: 'Failed to insert updated meal ingredients' };
        }
      }
    }

    // Replace condiments if provided
    if (mealData.condiments) {
      const { error: delCond } = await supabase.from('meal_condiments').delete().eq('meal_id', id);
      if (delCond) {
        console.error('Error clearing existing meal condiments:', delCond);
        return { success: false, error: 'Failed to update meal condiments' };
      }
      if (mealData.condiments.length > 0) {
        const rows = mealData.condiments.map(c => ({ meal_id: id, condiment_id: c.condiment_id, quantity: c.quantity }));
        const { error: insCond } = await supabase.from('meal_condiments').insert(rows);
        if (insCond) {
          console.error('Error inserting updated meal condiments:', insCond);
          return { success: false, error: 'Failed to insert updated meal condiments' };
        }
      }
    }

    // Replace dietary tags if provided
    if (mealData.dietary_tag_ids) {
      const { error: delTags } = await supabase.from('meal_dietary_tags').delete().eq('meal_id', id);
      if (delTags) {
        console.error('Error clearing existing meal dietary tags:', delTags);
        return { success: false, error: 'Failed to update meal dietary tags' };
      }
      if (mealData.dietary_tag_ids.length > 0) {
        const tagRows = mealData.dietary_tag_ids.map(tagId => ({ meal_id: id, tag_id: tagId }));
        const { error: insTags } = await supabase.from('meal_dietary_tags').insert(tagRows);
        if (insTags) {
          console.error('Error inserting updated meal dietary tags:', insTags);
          return { success: false, error: 'Failed to insert updated meal dietary tags' };
        }
      }
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'meal',
        data.meal_id,
        data.name,
        'updated',
        { name: mealData.name, category: mealData.category, recipe: mealData.recipe }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateMeal:', error);
    return { success: false, error: 'Failed to update meal' };
  }
};

// Delete a meal
export const deleteMeal = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('meal_id', id);

    if (error) {
      console.error('Error deleting meal:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteMeal:', error);
    return { success: false, error: 'Failed to delete meal' };
  }
};

// Get all dietary tags
export const getAllDietaryTags = async (): Promise<{ success: boolean; data?: DietaryTag[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('dietary_tags')
  .select('*')
  .eq('is_disabled', false)
  .order('tag_name');

    if (error) {
      console.error('Error getting dietary tags:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getAllDietaryTags:', error);
    return { success: false, error: 'Failed to get dietary tags' };
  }
};

// Create a dietary tag
export const createDietaryTag = async (tag_name: string): Promise<{ success: boolean; data?: DietaryTag; error?: string }> => {
  try {
    const cleanName = tag_name.trim();
    if (!cleanName) {
      return { success: false, error: 'Tag name is required' };
    }
    const { data, error } = await supabase
      .from('dietary_tags')
      .insert({ tag_name: cleanName })
      .select('*')
      .single();
    if (error) {
      if (error.message && error.message.toLowerCase().includes('duplicate')) {
        return { success: false, error: 'Tag with that name already exists' };
      }
      return { success: false, error: error.message };
    }
    return { success: true, data: data as DietaryTag };
  } catch (error) {
    console.error('Error in createDietaryTag:', error);
    return { success: false, error: 'Failed to create dietary tag' };
  }
};

// Soft delete (disable) a dietary tag
export const disableDietaryTag = async (tag_id: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('dietary_tags')
      .update({ is_disabled: true })
      .eq('tag_id', tag_id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Error in disableDietaryTag:', error);
    return { success: false, error: 'Failed to disable dietary tag' };
  }
};

// Get archived meals (meals marked as disabled)
export const getArchivedMeals = async (): Promise<{ success: boolean; data?: Meal[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        *,
        meal_ingredients(
          *,
          ingredients(*)
        ),
        meal_dietary_tags(
          *,
          dietary_tags(*)
        )
      `)
      .eq('is_disabled', true)
      .eq('ai_generated', false) // Only get manually created archived meals, exclude AI-generated
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error getting archived meals:', error);
      return { success: false, error: error.message };
    }
    const keys = (data || [])
      .map((m: any) => m.image_url)
      .filter(Boolean)
      .map((u: string) => toObjectPath(u));
    const signedMap = await getSignedUrls(keys);
    const enriched = (data || []).map((m: any) => ({
      ...m,
      signed_image_url: m.image_url ? signedMap[toObjectPath(m.image_url)] : undefined,
    }));
    return { success: true, data: enriched };
  } catch (error) {
    console.error('Error in getArchivedMeals:', error);
    return { success: false, error: 'Failed to get archived meals' };
  }
};

// Archive a meal (set is_disabled to true)
export const archiveMeal = async (id: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .update({ is_disabled: true, updated_at: new Date().toISOString() })
      .eq('meal_id', id)
      .select('meal_id, name')
      .single();

    if (error) {
      console.error('Error archiving meal:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'meal',
        data.meal_id,
        data.name,
        'archived'
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in archiveMeal:', error);
    return { success: false, error: 'Failed to archive meal' };
  }
};

// Restore a meal (set is_disabled to false)
export const restoreMeal = async (id: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .update({ is_disabled: false, updated_at: new Date().toISOString() })
      .eq('meal_id', id)
      .select('meal_id, name')
      .single();

    if (error) {
      console.error('Error restoring meal:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'meal',
        data.meal_id,
        data.name,
        'restored'
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in restoreMeal:', error);
    return { success: false, error: 'Failed to restore meal' };
  }
};

// ================================
// AUDIT TRAIL FUNCTIONS
// ================================

// Create activity log entry
export const createActivityLogEntry = async (
  entityType: 'meal' | 'ingredient' | 'cook',
  entityId: number | string,
  entityName: string,
  action: 'created' | 'updated' | 'archived' | 'restored' | 'approved' | 'rejected' | 'reopened',
  changes?: Record<string, any>,
  notes?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('activity_log')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
  action: action,
        changed_by: user.email || 'Unknown User',
        changes: changes,
  notes: notes
      });

    if (error) {
      console.error('Error creating activity log entry:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createActivityLogEntry:', error);
    return { success: false, error: 'Failed to create activity log entry' };
  }
};

// Get all activity logs with pagination
export const getActivityLogs = async (
  limit: number = 50,
  offset: number = 0
): Promise<{ success: boolean; data?: any[]; error?: string; total?: number }> => {
  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from('activity_log')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting activity log count:', countError);
      return { success: false, error: countError.message };
    }

    // Get logs with pagination
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching activity logs:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [], total: count || 0 };
  } catch (error) {
    console.error('Error in getActivityLogs:', error);
    return { success: false, error: 'Failed to fetch activity logs' };
  }
};

// ================================
// Dashboard Statistics
// ================================

export const getDashboardStats = async (): Promise<{
  success: boolean;
  data?: {
    totalMeals: number;
    totalIngredients: number;
    totalUsers: number;
    activeMeals: number;
    activeIngredients: number;
    archivedMeals: number;
    archivedIngredients: number;
    recentActivities: number;
    mealsByCategory: { category: string; count: number }[];
    ingredientsByCategory: { category: string; count: number }[];
  };
  error?: string;
}> => {
  try {
    // Core data queries (these tables should exist)
    const [
      mealsResult,
      ingredientsResult,
      usersResult,
      mealsCategoryResult,
      ingredientsCategoryResult
    ] = await Promise.all([
      // Total meals (active and archived)
      supabase.from('meals').select('meal_id, is_disabled', { count: 'exact' }),

      // Total ingredients (active and archived)
      supabase.from('ingredients').select('ingredient_id, is_disabled', { count: 'exact' }),

      // Total users
      supabase.from('profiles').select('id', { count: 'exact' }),

      // Meals by category
      supabase
        .from('meals')
        .select('category')
        .eq('is_disabled', false),

      // Ingredients by category
      supabase
        .from('ingredients')
        .select('category')
        .eq('is_disabled', false)
    ]);

    // Check for errors in core queries
    if (mealsResult.error) throw mealsResult.error;
    if (ingredientsResult.error) throw ingredientsResult.error;
    if (usersResult.error) throw usersResult.error;
    if (mealsCategoryResult.error) throw mealsCategoryResult.error;
    if (ingredientsCategoryResult.error) throw ingredientsCategoryResult.error;

    // Try to get recent activities, but don't fail if table doesn't exist
    let recentActivitiesCount = 0;
    try {
      const activitiesResult = await supabase
        .from('activity_log')
        .select('log_id', { count: 'exact' })
        .gte('changed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (!activitiesResult.error) {
        recentActivitiesCount = activitiesResult.count || 0;
      }
    } catch (error) {
      console.warn('Activity log table not found, skipping recent activities count');
    }

    // Process meals data
    const allMeals = mealsResult.data || [];
    const activeMeals = allMeals.filter(meal => !meal.is_disabled).length;
    const archivedMeals = allMeals.filter(meal => meal.is_disabled).length;

    // Process ingredients data
    const allIngredients = ingredientsResult.data || [];
    const activeIngredients = allIngredients.filter(ingredient => !ingredient.is_disabled).length;
    const archivedIngredients = allIngredients.filter(ingredient => ingredient.is_disabled).length;

    // Process meals by category
    const mealsByCategory = mealsCategoryResult.data?.reduce((acc: Record<string, number>, meal: any) => {
      acc[meal.category] = (acc[meal.category] || 0) + 1;
      return acc;
    }, {}) || {};

    // Process ingredients by category
    const ingredientsByCategory = ingredientsCategoryResult.data?.reduce((acc: Record<string, number>, ingredient: any) => {
      acc[ingredient.category] = (acc[ingredient.category] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      success: true,
      data: {
        totalMeals: mealsResult.count || 0,
        totalIngredients: ingredientsResult.count || 0,
        totalUsers: usersResult.count || 0,
        activeMeals,
        activeIngredients,
        archivedMeals,
        archivedIngredients,
        recentActivities: recentActivitiesCount,
        mealsByCategory: Object.entries(mealsByCategory).map(([category, count]) => ({
          category,
          count: count as number
        })),
        ingredientsByCategory: Object.entries(ingredientsByCategory).map(([category, count]) => ({
          category,
          count: count as number
        }))
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { success: false, error: 'Failed to fetch dashboard statistics' };
  }
};

export const getRecentActivities = async (limit: number = 5): Promise<{
  success: boolean;
  data?: ActivityLog[];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) {
      // If the table doesn't exist, return empty data instead of throwing error
      if (error.code === '42P01') {
        console.warn('Activity log table not found, returning empty activities');
        return { success: true, data: [] };
      }
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return { success: false, error: 'Failed to fetch recent activities' };
  }
};

// ================================
// Cook Verification (Grants) Queries
// ================================
import type { Cook } from '../types';

// Fetch cooks pending review (for_review = true, is_verified = false)
export const getPendingCooks = async (params: { search?: string; page?: number; pageSize?: number } = {}): Promise<{
  success: boolean; data?: Cook[]; total?: number; hasMore?: boolean; error?: string;
}> => {
  const { search, page = 1, pageSize = 20 } = params;
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('cooks')
      .select('*', { count: 'exact' })
      .eq('for_review', true)
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      // Search across available text columns we have (username, home_address, cook_type)
      query = query.or(`username.ilike.${term},home_address.ilike.${term},cook_type.ilike.${term}`);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('[getPendingCooks] primary query error:', error);
      throw error;
    }
    console.log('[getPendingCooks] result length:', data?.length, 'count:', count, 'page:', page, 'pageSize:', pageSize, 'search:', search);
    // Diagnostic fallback if empty on first page
    if ((data?.length || 0) === 0 && page === 1) {
      const fallback = await supabase
        .from('cooks')
        .select('id, for_review, is_verified, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(10);
      console.log('[getPendingCooks] fallback sample (unfiltered first 10):', fallback.data, 'fallback count:', fallback.count, 'fallback error:', fallback.error);
    }
    return {
      success: true,
      data: (data || []) as Cook[],
      total: count || 0,
      hasMore: to + 1 < (count || 0)
    };
  } catch (error) {
    console.error('Error fetching pending cooks:', error);
    return { success: false, error: 'Failed to fetch pending cooks' };
  }
};

// Generic cook fetch with status filter: 'pending' | 'approved' | 'rejected' | 'all'
export const getCooksByStatus = async (params: { status?: 'pending' | 'approved' | 'rejected' | 'all'; search?: string; page?: number; pageSize?: number } = {}): Promise<{
  success: boolean; data?: Cook[]; total?: number; hasMore?: boolean; error?: string;
}> => {
  const { status = 'all', search, page = 1, pageSize = 20 } = params;
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('cooks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status === 'pending') {
      query = query.eq('for_review', true).eq('is_verified', false).eq('is_rejected', false);
    } else if (status === 'approved') {
      query = query.eq('for_review', true).eq('is_verified', true).eq('is_rejected', false);
    } else if (status === 'rejected') {
      query = query.eq('for_review', true).eq('is_rejected', true);
    } else if (status === 'all') {
      query = query.eq('for_review', true);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`username.ilike.${term},home_address.ilike.${term},cook_type.ilike.${term}`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { success: true, data: (data || []) as Cook[], total: count || 0, hasMore: to + 1 < (count || 0) };
  } catch (e) {
    console.error('[getCooksByStatus] error:', e);
    return { success: false, error: 'Failed to fetch cooks' };
  }
};

export const getAllCooks = async (): Promise<{ success: boolean; data?: Cook[]; error?: string }> => {
  try {
    const { data, error } = await supabase.from('cooks').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: (data || []) as Cook[] };
  } catch (e) {
    console.error('[getAllCooks] error:', e);
    return { success: false, error: 'Failed to fetch cooks' };
  }
};

// Approve cook application: set is_verified=true, keep for_review=true, clear rejection
export const approveCook = async (cookId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('cooks')
  .update({ is_verified: true, is_rejected: false, for_review: true })
      .eq('id', cookId);
    if (error) throw error;
  // log
  await createActivityLogEntry('cook', cookId, 'Cook', 'approved');
    return { success: true };
  } catch (error) {
    console.error('Error approving cook:', error);
    return { success: false, error: 'Failed to approve cook' };
  }
};

// Reject cook application: mark rejected, keep for_review=true
export const rejectCook = async (cookId: string, _reason: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('cooks')
  .update({ is_verified: false, is_rejected: true, for_review: true, rejection_reason: _reason })
      .eq('id', cookId);
    if (error) throw error;
  await createActivityLogEntry('cook', cookId, 'Cook', 'rejected', { rejection_reason: _reason });
    return { success: true };
  } catch (error) {
    console.error('Error rejecting cook:', error);
    return { success: false, error: 'Failed to reject cook' };
  }
};

// Re-open / reset application: clear verified & rejected
export const reopenCookReview = async (cookId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('cooks')
  .update({ for_review: true, is_rejected: false, is_verified: false })
      .eq('id', cookId);
    if (error) throw error;
  await createActivityLogEntry('cook', cookId, 'Cook', 'reopened');
    return { success: true };
  } catch (error) {
    console.error('Error reopening cook review:', error);
    return { success: false, error: 'Failed to reopen review' };
  }
};

// List recently verified cooks (for sidebar/metrics)
export const getRecentlyVerifiedCooks = async (limit: number = 5): Promise<{ success: boolean; data?: Cook[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('cooks')
      .select('*')
      .eq('is_verified', true)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { success: true, data: (data || []) as Cook[] };
  } catch (error) {
    console.error('Error fetching recently verified cooks:', error);
    return { success: false, error: 'Failed to fetch verified cooks' };
  }
};

// ============================= CONDIMENTS =============================

// Get all condiments
export const getAllCondiments = async () => {
  try {
    const { data, error } = await supabase
      .from('condiments')
      .select('*, package_price, package_quantity')
      .order('name');
    
    if (error) throw error;
    
    // Add signed URLs for images
    let condimentsWithUrls = data || [];
    if (condimentsWithUrls.length > 0) {
      const paths = condimentsWithUrls
        .map(condiment => condiment.image_url)
        .filter(Boolean);
      
      if (paths.length > 0) {
        const urlMap = await getSignedUrls(paths);
        condimentsWithUrls = condimentsWithUrls.map(condiment => ({
          ...condiment,
          signed_image_url: condiment.image_url ? urlMap[condiment.image_url] : null
        }));
      }
    }
    
    return { success: true, data: condimentsWithUrls };
  } catch (error) {
    console.error('Error fetching condiments:', error);
    return { success: false, error: 'Failed to fetch condiments' };
  }
};

// Create condiment
export const createCondiment = async (condimentData: any) => {
  try {
    const { data, error } = await supabase
      .from('condiments')
      .insert([condimentData])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating condiment:', error);
    return { success: false, error: 'Failed to create condiment' };
  }
};

// Update condiment
export const updateCondiment = async (condimentId: number, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('condiments')
      .update(updates)
      .eq('condiment_id', condimentId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating condiment:', error);
    return { success: false, error: 'Failed to update condiment' };
  }
};

// Archive/restore condiment
export const toggleCondimentArchiveStatus = async (condimentId: number, archived: boolean) => {
  try {
    const { data, error } = await supabase
      .from('condiments')
      .update({ is_archived: archived })
      .eq('condiment_id', condimentId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error toggling condiment archive status:', error);
    return { success: false, error: 'Failed to toggle condiment archive status' };
  }
};

// ================================