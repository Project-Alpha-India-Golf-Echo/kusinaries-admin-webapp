// Shared quantity parsing, conversion, and formatting utilities

export type Unit = 'g' | 'kg' | 'ml' | 'cup' | 'cups' | 'tbsp' | 'tsp' | 'piece' | 'pieces';

export interface ParsedQuantity {
  value: number; // numeric value in the detected unit
  unit: Unit | null; // if null, unit was absent; treat as grams by convention
  raw: string; // original string
}

const QTY_REGEX = /(?=\S)(?=.*\d)(\d+\.?\d*|\d*\.\d+)\s*(g|kg|ml|cup|cups|tbsp|tsp|piece|pieces)?/i;

export function parseQuantity(input: string): ParsedQuantity | null {
  if (!input) return null;
  const match = input.trim().match(QTY_REGEX);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = (match[2]?.toLowerCase() as Unit) || null;
  if (Number.isNaN(value)) return null;
  return { value, unit, raw: input };
}

// Convert to a canonical unit for aggregation: solids -> grams, liquids -> ml, others -> keep
export function toCanonical(value: number, unit: Unit | null): { amount: number; canonical: 'g' | 'ml' } | null {
  if (!unit || unit === 'g' || unit === 'kg' || unit === 'piece' || unit === 'pieces' || unit === 'cup' || unit === 'cups' || unit === 'tbsp' || unit === 'tsp') {
    // Heuristic: treat non-ml units as solids (g). Callers should distinguish liquids if needed.
    if (unit === 'kg') return { amount: value * 1000, canonical: 'g' };
    if (unit === 'g' || unit === null) return { amount: value, canonical: 'g' };
    if (unit === 'cup' || unit === 'cups') return { amount: value * 240, canonical: 'g' };
    if (unit === 'tbsp') return { amount: value * 15, canonical: 'g' };
    if (unit === 'tsp') return { amount: value * 5, canonical: 'g' };
    if (unit === 'piece' || unit === 'pieces') return { amount: value * 100, canonical: 'g' }; // 1 piece ~100g rough
    return { amount: value, canonical: 'g' };
  }
  if (unit === 'ml') return { amount: value, canonical: 'ml' };
  return null;
}

export function scaleQuantity(value: number, factor: number): number {
  return value * factor;
}

function roundByUnit(value: number, unit: Unit | null): number {
  switch (unit) {
    case 'g':
    case null:
      return Math.round(value / 5) * 5; // nearest 5g
    case 'kg':
      return Math.round(value * 1000 / 5) * 5 / 1000; // round grams then back to kg
    case 'ml':
      return Math.round(value / 5) * 5; // nearest 5ml
    case 'tbsp':
    case 'tsp':
    case 'cup':
    case 'cups':
      return Math.round(value / 0.25) * 0.25; // quarter units
    case 'piece':
    case 'pieces':
      return Math.round(value * 2) / 2; // halves
    default:
      return value;
  }
}

export function formatQuantity(value: number, unit: Unit | null): string {
  const rounded = roundByUnit(value, unit);
  const n = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(rounded % 1 === 0.5 ? 1 : 2).replace(/\.0+$/, '');
  if (!unit) return `${n} g`; // default to grams if no unit
  // pluralize cups and pieces for readability
  if (unit === 'cup') return `${n} ${Number(rounded) === 1 ? 'cup' : 'cups'}`;
  if (unit === 'cups') return `${n} ${Number(rounded) === 1 ? 'cup' : 'cups'}`;
  if (unit === 'piece') return `${n} ${Number(rounded) === 1 ? 'piece' : 'pieces'}`;
  if (unit === 'pieces') return `${n} ${Number(rounded) === 1 ? 'piece' : 'pieces'}`;
  return `${n} ${unit}`;
}

export function scaleQuantityString(input: string, factor: number): string {
  const parsed = parseQuantity(input);
  if (!parsed) return input; // leave as-is if not parseable
  const scaled = scaleQuantity(parsed.value, factor);
  // Minimums for practicality (avoid tiny pinches disappearing)
  let minByUnit: Partial<Record<Unit, number>> = { tsp: 0.25, tbsp: 0.25 };
  const unit = parsed.unit;
  let adjusted = scaled;
  if (unit && minByUnit[unit] && adjusted > 0 && adjusted < (minByUnit[unit] as number)) {
    adjusted = minByUnit[unit] as number;
  }
  return formatQuantity(adjusted, unit);
}
