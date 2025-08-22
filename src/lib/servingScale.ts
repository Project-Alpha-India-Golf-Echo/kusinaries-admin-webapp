// Serving scale configuration and helpers

export type AgeGroup = 'toddler' | 'kid' | 'teen' | 'adult' | 'pregnant' | 'elderly';

// Safe starting multipliers relative to 1 adult serving
export const SERVING_MULTIPLIERS: Record<AgeGroup, number> = {
  toddler: 0.5,   // 1–6
  kid: 0.75,      // 7–12
  teen: 1.2,      // 13–19
  adult: 1.0,     // 20–39
  pregnant: 1.2,  // Pregnant
  elderly: 0.9    // 60–69
};

export type FamilyMembers = Partial<Record<AgeGroup, number>>;

export function aggregateFamilyFactor(members: FamilyMembers): number {
  return (Object.entries(members || {}) as [AgeGroup, number][]) // cast for type narrow
    .reduce((sum, [group, count]) => sum + (count || 0) * (SERVING_MULTIPLIERS[group] ?? 1), 0);
}
