## Admin App – Data Access & RLS Guide

This document explains how the Admin app should interact with Supabase under Row Level Security (RLS). Admin operations must be performed with elevated privileges via secure contexts only.

### Principle
- Admin writes/updates must use the service role key (server-side) or an Admin JWT minted by your backend. Do not expose the service role key to clients.
- Reads can be done as admin users authenticated through Supabase Auth whose `profiles.role = 'admin'`.

### Admin identity
- Admin detection uses a helper policy check (is_admin) that evaluates to true if the signed-in user has `public.profiles.role = 'admin'` (and can be extended with JWT claims if needed).
- Ensure the admin user has a corresponding row in `public.profiles` with `role = 'admin'`.

## Tables and permissions

### profiles
- Admins can SELECT all profiles.
- Regular users can only view/update their own profile.
- Profile creation remains via trigger on sign up.

Admin example – list users:
```ts
// As an admin user (session), or from server with service role
const { data: profiles, error } = await supabase.from('profiles').select('*').limit(100);
```

### families
- Users manage only their own families (profile_id = auth.uid()).
- Admins can SELECT/UPDATE/DELETE/INSERT any family rows when operating with admin privileges.

Admin example – update arbitrary family:
```ts
// Use service role on the server or admin session
const { error } = await supabase
  .from('families')
  .update({ budget: 'medium' })
  .eq('id', 123);
```

### cooks
- Users manage their own cook row.
- Admins can review/verify cooks by updating fields like `is_verified`, `for_review`.

Admin example – verify a cook:
```ts
const { error } = await supabase
  .from('cooks')
  .update({ is_verified: true, for_review: false })
  .eq('id', '<cook-uuid>');
```

### Catalog tables
- meals, ingredients, meal_ingredients, meal_dietary_tags, dietary_tags
  - Public/clients may SELECT (read-only).
  - Only Admins may INSERT/UPDATE/DELETE.

Admin example – add a meal (server-side with service role):
```ts
const { data, error } = await supabase
  .from('meals')
  .insert([{ name: 'New Dish', category: 'Best for Lunch', recipe: '...' }])
  .select()
  .single();
```

### activity_log
- Only Admins can SELECT/UPDATE/DELETE.
- INSERT is allowed to authenticated actors via RLS so server triggers can record changes. Prefer server-managed writes for auditing.

## Operational guidance
- Never ship the service role key in a client app.
- Prefer running admin mutations from a backend (Edge Functions or server) using the service role key.
- If you must run admin operations from an Admin UI client, mint an Admin JWT from your backend and pass it to the Admin app session.

## Minimal smoke tests
- Admin can read all profiles and families.
- Admin can create/update meals and ingredients.
- Non-admin cannot modify catalog tables and sees only their own rows.

## Extending policies
- If you add new tables:
  - Decide whether they are owned-by-user (add `profile_id uuid`) or public catalog/admin-managed.
  - Mirror the appropriate policy pattern (owner vs admin-only write; public or auth-only read).

## Storage: images bucket (private)

The `images` bucket is private. Admins may access all objects; regular users can only access their own via signed URLs. Never expose the service role key in a client; prefer server-side operations for admin-wide listing and downloads.

### Admin listing and signed reads (server-side preferred)
```ts
// Server-side with service role client
const folder = '';
const { data: files, error } = await supabaseAdmin.storage
  .from('images')
  .list(folder, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

// Generate a signed URL for any file (admin)
const { data: signed, error: sErr } = await supabaseAdmin.storage
  .from('images')
  .createSignedUrl(files[0].name, 60 * 15);
```

### Client Admin UI (if you must)
If an Admin UI runs in the browser, mint an admin JWT for that user session via your backend. Then use the normal storage client to list and read across users. Do not ship the service key.

### Upload guidance
- For admin-created assets (e.g., catalog images), use an admin path convention like `admin/<uuid>.ext`.
- For user assets reviewed by admins, the object key usually remains under the user’s folder; admins can still access due to admin policy.

### Operational notes
- Use short TTLs for signed URLs and refresh when needed.
- If you rename/move sensitive files, update DB references storing the object key.
