// Test script to verify "Best for Snacks" category behavior

// Simulate the category selection logic
function handleCategoryChange(currentCategories, category, checked) {
  let newCategories;
  
  if (category === 'Best for Snacks') {
    // If "Best for Snacks" is being checked, uncheck all others
    // If "Best for Snacks" is being unchecked, just remove it
    newCategories = checked ? ['Best for Snacks'] : [];
  } else {
    // If any other category is being checked, first remove "Best for Snacks"
    const categoriesWithoutSnacks = currentCategories.filter(c => c !== 'Best for Snacks');
    newCategories = checked
      ? [...categoriesWithoutSnacks, category]
      : categoriesWithoutSnacks.filter(c => c !== category);
  }
  
  return newCategories;
}

// Test cases
console.log('Testing "Best for Snacks" category behavior:');

// Test 1: Select "Best for Snacks" when other categories are selected
let categories = ['Best for Breakfast', 'Best for Lunch'];
let result = handleCategoryChange(categories, 'Best for Snacks', true);
console.log('Test 1 - Select Snacks when others selected:', result);
console.log('Expected: ["Best for Snacks"]');
console.log('Passed:', JSON.stringify(result) === JSON.stringify(['Best for Snacks']));

// Test 2: Select another category when "Best for Snacks" is selected
categories = ['Best for Snacks'];
result = handleCategoryChange(categories, 'Best for Breakfast', true);
console.log('\nTest 2 - Select Breakfast when Snacks selected:', result);
console.log('Expected: ["Best for Breakfast"]');
console.log('Passed:', JSON.stringify(result) === JSON.stringify(['Best for Breakfast']));

// Test 3: Uncheck "Best for Snacks"
categories = ['Best for Snacks'];
result = handleCategoryChange(categories, 'Best for Snacks', false);
console.log('\nTest 3 - Uncheck Snacks:', result);
console.log('Expected: []');
console.log('Passed:', JSON.stringify(result) === JSON.stringify([]));

// Test 4: Select multiple non-snack categories
categories = ['Best for Breakfast'];
result = handleCategoryChange(categories, 'Best for Lunch', true);
console.log('\nTest 4 - Select Lunch when Breakfast selected:', result);
console.log('Expected: ["Best for Breakfast", "Best for Lunch"]');
console.log('Passed:', JSON.stringify(result) === JSON.stringify(['Best for Breakfast', 'Best for Lunch']));

console.log('\nAll tests completed!');
