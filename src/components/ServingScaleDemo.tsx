import React, { useMemo, useState } from 'react';
import { scaleMeal, scaleMealForFamily } from '../lib/mealScaling';
import { SERVING_MULTIPLIERS, type AgeGroup } from '../lib/servingScale';
import type { Meal } from '../types';
import { Button } from './ui/button';

interface Props {
  meal: Meal | null;
}

export const ServingScaleDemo: React.FC<Props> = ({ meal }) => {
  const [group, setGroup] = useState<AgeGroup>('adult');
  const [count, setCount] = useState<number>(1);

  const scaled = useMemo(() => {
    if (!meal) return null;
    const factor = SERVING_MULTIPLIERS[group] * (count || 1);
    return scaleMeal(meal, factor);
  }, [meal, group, count]);

  const familyScaled = useMemo(() => {
    if (!meal) return null;
    return scaleMealForFamily(meal, { adult: 2, teen: 2 });
  }, [meal]);

  if (!meal) return null;

  return (
    <div className="mt-6 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-medium">Servings preview:</span>
        <select className="border rounded px-2 py-1" value={group} onChange={e => setGroup(e.target.value as AgeGroup)}>
          {Object.keys(SERVING_MULTIPLIERS).map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <input type="number" className="border rounded px-2 py-1 w-20" min={1} value={count}
               onChange={e => setCount(Math.max(1, Number(e.target.value) || 1))} />
        <Button variant="outline" onClick={() => { setGroup('adult'); setCount(1); }}>Reset</Button>
      </div>
      {scaled && (
        <div className="text-sm">
          <div className="mb-2 text-gray-700">Factor: <span className="font-mono">{scaled.factor.toFixed(2)}</span></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="font-medium mb-1">Ingredients</div>
              <ul className="list-disc pl-5 space-y-1">
                {scaled.ingredients.map(i => (
                  <li key={i.id}><span className="text-gray-700">{i.name}</span>: <span className="font-mono">{i.quantity}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-medium mb-1">Condiments</div>
              <ul className="list-disc pl-5 space-y-1">
                {scaled.condiments.map(c => (
                  <li key={c.id}><span className="text-gray-700">{c.name}</span>: <span className="font-mono">{c.quantity}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {familyScaled && (
        <div className="mt-5">
          <div className="font-medium mb-1">Family example (2 adults, 2 teens)</div>
          <div className="text-xs text-gray-600 mb-2">Factor: {familyScaled.factor.toFixed(2)}</div>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {familyScaled.ingredients.map(i => (
              <li key={i.id}><span className="text-gray-700">{i.name}</span>: <span className="font-mono">{i.quantity}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
