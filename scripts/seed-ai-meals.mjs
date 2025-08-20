#!/usr/bin/env node
/**
 * Seed AI-generated meals into the database with clear separation (ai_generated + ai_batch_id).
 * Safe to delete later using the same batch id.
 *
 * Usage:
 *  node scripts/seed-ai-meals.mjs            # normal run
 *  node scripts/seed-ai-meals.mjs --dry-run  # preview only
 *  node scripts/seed-ai-meals.mjs --force    # ignore existing AI meals check
 *
 * Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// Lightweight .env loader (only handles KEY=VALUE, ignores export, comments)
function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    if (!key) continue;
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

// Resolve env values with fallback order: explicit SUPABASE_* > VITE_* > import.meta.env (if available)
let viteEnv = {};
try { viteEnv = (import.meta && import.meta.env) ? import.meta.env : {}; } catch { /* ignore */ }
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || viteEnv.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SERVICE_ROLE_KEY || viteEnv.VITE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const APPEND = args.includes('--append');
const SPARSER_TAGS = args.includes('--sparser-tags');
const COUNT_ARG = args.find(a => a.startsWith('--count='));
const TARGET_COUNT = COUNT_ARG ? parseInt(COUNT_ARG.split('=')[1],10) : 50; // adjustable

const headers = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json'
};

async function rpc(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${path}: ${text}`);
  }
  return res.json();
}

async function select(path, params = {}) {
  const query = new URLSearchParams({ select: '*', ...params });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}?${query}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function insert(path, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(rows)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function del(path, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${path}?${filter}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(await res.text());
  return true;
}

function normalizeName(n) { return n.toLowerCase().trim(); }

// Basic ingredient catalog we expect; quantities and overrides can be enhanced later.
const INGREDIENT_SPEC = [
  { name: 'Brown Rice', category: 'Go', price_per_kilo: 70 },
  { name: 'White Rice', category: 'Go', price_per_kilo: 50 },
  { name: 'Sweet Potato', category: 'Go', price_per_kilo: 90 },
  { name: 'Oats', category: 'Go', price_per_kilo: 120 },
  { name: 'Whole Wheat Bread', category: 'Go', price_per_kilo: 150 },
  { name: 'Chicken Breast', category: 'Grow', price_per_kilo: 260 },
  { name: 'Tilapia', category: 'Grow', price_per_kilo: 180 },
  { name: 'Egg', category: 'Grow', price_per_kilo: 110 },
  { name: 'Pork Lean', category: 'Grow', price_per_kilo: 270 },
  { name: 'Tofu', category: 'Grow', price_per_kilo: 140 },
  { name: 'Mongo Beans', category: 'Grow', price_per_kilo: 130 },
  { name: 'Malunggay Leaves', category: 'Glow', glow_subcategory: 'Vegetables', price_per_kilo: 200 },
  { name: 'Carrots', category: 'Glow', glow_subcategory: 'Vegetables', price_per_kilo: 90 },
  { name: 'Spinach', category: 'Glow', glow_subcategory: 'Vegetables', price_per_kilo: 180 },
  { name: 'Tomato', category: 'Glow', glow_subcategory: 'Vegetables', price_per_kilo: 85 },
  { name: 'Banana', category: 'Glow', glow_subcategory: 'Fruits', price_per_kilo: 70 },
  { name: 'Papaya', category: 'Glow', glow_subcategory: 'Fruits', price_per_kilo: 60 },
  { name: 'Mango', category: 'Glow', glow_subcategory: 'Fruits', price_per_kilo: 150 },
  { name: 'Apple', category: 'Glow', glow_subcategory: 'Fruits', price_per_kilo: 180 },
];

// Simple deterministic PRNG
function mulberry32(seed) { return function() { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(20250819);

function pick(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx,1)[0]);
  }
  return out;
}

function generateRecipe(name) {
  return [
    `Boil or prep base carbohydrate as needed for the meal.`,
    `Cook protein gently (grill, sauté, or simmer) until safe and tender.`,
    `Lightly cook or steam vegetables to retain color and nutrients.`,
    `Assemble ${name} on a plate with fruit served fresh on the side.`
  ].join('\n');
}

function buildCategoryDistribution(total) {
  const ratios = [0.28,0.28,0.28,0.16];
  const categories = ['Best for Breakfast','Best for Lunch','Best for Dinner','Best for Snacks'];
  let remaining = total;
  const dist = categories.map((c,i) => {
    const target = i === categories.length -1 ? remaining : Math.max(1, Math.round(total*ratios[i]));
    remaining -= target;
    return { category: c, target };
  });
  let sum = dist.reduce((a,b)=>a+b.target,0);
  while (sum < total) { dist[0].target++; sum++; }
  while (sum > total) { dist[0].target--; sum--; }
  return dist;
}
const CATEGORY_DISTRIBUTION = buildCategoryDistribution(TARGET_COUNT);

function buildMeals(ingredientsMap, nameOffset) {
  const meals = [];
  let counter = 1 + (nameOffset || 0);
  for (const dist of CATEGORY_DISTRIBUTION) {
    for (let i=0;i<dist.target;i++) {
      const go = pick(ingredientsMap.byCategory.Go,1);
      const grow = pick(ingredientsMap.byCategory.Grow,1);
      // ensure both a vegetable + fruit
      const veg = pick(ingredientsMap.glowVegetables,1);
      const fruit = pick(ingredientsMap.glowFruits,1);
      const name = `${dist.category.replace('Best for ','')} Plate ${counter}`;
      const baseQty = () => `${Math.round(rng()*80+120)}g`; // 120-200g
      const proteinQty = () => `${Math.round(rng()*50+80)}g`; // 80-130g
      const vegQty = () => `${Math.round(rng()*40+60)}g`; // 60-100g
      const fruitQty = () => rng() < 0.5 ? '1 piece' : `${Math.round(rng()*50+80)}g`;

      meals.push({
        name,
        category: dist.category,
        ingredients: [
          { ingredient_id: go[0].ingredient_id, quantity: baseQty() },
          { ingredient_id: grow[0].ingredient_id, quantity: proteinQty() },
          { ingredient_id: veg[0].ingredient_id, quantity: vegQty() },
          { ingredient_id: fruit[0].ingredient_id, quantity: fruitQty() },
        ],
        recipe: generateRecipe(name),
      });
      counter++;
    }
  }
  return meals.slice(0, TARGET_COUNT);
}

async function ensureIngredients() {
  const existing = await select('ingredients');
  const byName = new Map(existing.map(i => [normalizeName(i.name), i]));
  const created = [];
  for (const spec of INGREDIENT_SPEC) {
    if (!byName.has(normalizeName(spec.name))) {
      const row = {
        name: spec.name,
        category: spec.category,
        price_per_kilo: spec.price_per_kilo,
        glow_subcategory: spec.glow_subcategory || null,
        is_disabled: false,
        created_at: new Date().toISOString()
      };
      if (DRY_RUN) {
        created.push({ ...row, ingredient_id: -1 });
      } else {
        const [inserted] = await insert('ingredients', [row]);
        created.push(inserted);
        byName.set(normalizeName(inserted.name), inserted);
      }
    }
  }
  return { all: [...byName.values()], created };
}

async function main() {
  console.log('--- AI Meal Seeding Script ---');
  const batchId = randomUUID();
  console.log('Batch ID:', batchId);

  if (!APPEND) {
    if (!DRY_RUN) {
      console.log('Cleaning existing meals (test + AI)');
      await del('meal_dietary_tags', 'tag_id=neq.0');
      await del('meal_ingredients', 'meal_ingredient_id=neq.0');
      await del('meals', 'meal_id=neq.0');
    } else {
      console.log('[Dry Run] Skipping cleanup');
    }
  } else {
    console.log('Append mode: existing meals retained');
  }

  const { all: allIngredients } = await ensureIngredients();

  // Organize ingredients for selection
  const byCategory = { Go: [], Grow: [], Glow: [] };
  const glowVegetables = []; const glowFruits = [];
  for (const ing of allIngredients) {
    byCategory[ing.category].push(ing);
    if (ing.category === 'Glow') {
      if (ing.glow_subcategory === 'Vegetables') glowVegetables.push(ing);
      if (ing.glow_subcategory === 'Fruits') glowFruits.push(ing);
    }
  }
  const ingredientsMap = { byCategory, glowVegetables, glowFruits };

  let existingCount = 0;
  if (APPEND) {
    try {
      const existingMeals = await select('meals', { select: 'meal_id' });
      existingCount = existingMeals.length;
    } catch (e) { /* ignore */ }
  }
  const meals = buildMeals(ingredientsMap, existingCount);
  console.log(`Generated ${meals.length} meals`);

  // Fetch existing dietary tags and use ONLY those not disabled (no creation of new tags here)
  let dietaryTags = await select('dietary_tags');
  if (!Array.isArray(dietaryTags)) dietaryTags = [];
  dietaryTags = dietaryTags.filter(t => !t.is_disabled);
  const tagLookup = new Map(dietaryTags.map(t => [normalizeName(t.tag_name), t]));

  // Build helper arrays for heuristic matches
  // Map current enabled tags to functional categories (fallbacks if patterns absent)
  const proteinTags = dietaryTags.filter(t => /vegan|vegetarian|paleo/i.test(t.tag_name)); // stand-ins for protein-friendly choices
  const balanceTags = dietaryTags.filter(t => /paleo|vegetarian|vegan/i.test(t.tag_name));
  const lightTags = dietaryTags.filter(t => /vegan|vegetarian|dairy-free/i.test(t.tag_name));
  const fiberTags = dietaryTags.filter(t => /vegan|vegetarian/i.test(t.tag_name));

  function randomFrom(list) { return list.length ? list[Math.floor(rng()*list.length)] : null; }

  function pickTags(meal) {
    const chosen = new Set();
    if (dietaryTags.length) {
      let tagTarget = 2;
      if (SPARSER_TAGS) {
        const r = rng();
        if (r < 0.4) tagTarget = 0; else if (r < 0.8) tagTarget = 1; else tagTarget = 2;
      } else {
        const r = rng();
        if (r < 0.2) tagTarget = 1; else if (r < 0.6) tagTarget = 2; else tagTarget = 3;
      }
      const pools = [proteinTags, balanceTags, lightTags, fiberTags].filter(p=>p.length);
      while (chosen.size < tagTarget && pools.length) {
        const pool = pools[Math.floor(rng()*pools.length)];
        const pickTag = randomFrom(pool);
        if (pickTag) chosen.add(pickTag.tag_id);
        if (chosen.size >= tagTarget) break;
        if (rng() < 0.3) {
          const anyTag = randomFrom(dietaryTags);
          if (anyTag) chosen.add(anyTag.tag_id);
        }
        if (chosen.size > 6) break;
      }
      if (!SPARSER_TAGS && chosen.size === 0) {
        const fallback = randomFrom(dietaryTags);
        if (fallback) chosen.add(fallback.tag_id);
      }
    }
    return Array.from(chosen).slice(0,3);
  }

  if (DRY_RUN) {
    console.log('[Dry Run] Sample meal:', meals[0]);
    console.log('Would insert', meals.length, 'meals');
    return;
  }

  // Insert meals then ingredients + tags
  for (const meal of meals) {
    const mealRow = {
      name: meal.name,
      category: meal.category,
      recipe: meal.recipe,
      image_url: null,
      is_disabled: false,
      ai_generated: true,
      ai_batch_id: batchId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const [insertedMeal] = await insert('meals', [mealRow]);
    await insert('meal_ingredients', meal.ingredients.map(i => ({ ...i, meal_id: insertedMeal.meal_id })));
    const tagIds = pickTags(meal);
    if (tagIds.length) {
      await insert('meal_dietary_tags', tagIds.map(tag_id => ({ meal_id: insertedMeal.meal_id, tag_id })));
    }
  }

  console.log('Seeding complete. Batch ID:', batchId);
}

main().catch(err => { console.error(err); process.exit(1); });
