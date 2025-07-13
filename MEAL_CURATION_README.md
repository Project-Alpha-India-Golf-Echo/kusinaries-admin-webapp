# Meal Curation System - Pinggang Pinoy Framework

This meal curation system allows users to create, manage, and curate individual meals based on the Filipino "Pinggang Pinoy" nutritional framework, which emphasizes balanced intake of Go (energy), Grow (protein), and Glow (vitamins/minerals) foods.

## Features Implemented

### ✅ Core Functionality

1. **Meal Creation & Management**
   - Create new meals with name, category, picture, and recipe
   - Edit existing meals
   - Archive/restore meals (soft delete)
   - Real-time estimated price calculation

2. **Pinggang Pinoy Ingredient System**
   - Three categorized ingredient sections: Go, Grow, Glow
   - Browse and search ingredients within each category
   - Add custom ingredients with price per kilo
   - Specify quantities for each ingredient in meals

3. **Advanced Filtering & Search**
   - Search meals by name
   - Filter by category (Breakfast, Lunch, Dinner, Snacks)
   - Filter by dietary tags (Low-Carb, High-Protein, Vegetarian, etc.)
   - Sort by name, date created, or estimated price
   - Toggle between active and archived meals

4. **Comprehensive Meal Library**
   - Grid view of all meals with cards showing key information
   - Meal categories with visual indicators
   - Dietary tags display
   - Ingredient count summaries (Go/Grow/Glow)
   - Estimated pricing based on ingredients

## Database Schema

The system uses PostgreSQL with the following normalized structure:

### Tables Created:
- `ingredients` - Master list of all available ingredients
- `meals` - Main meal information
- `meal_ingredients` - Many-to-many relationship between meals and ingredients
- `dietary_tags` - Available dietary tags
- `meal_dietary_tags` - Many-to-many relationship between meals and tags

### SQL Setup:
Run the SQL script in `/database/meal_curation_tables.sql` to set up the database tables with sample data.

## Component Architecture

### Main Components:
- **MealCurationPage** - Main page with meal library and filtering
- **CreateEditMealModal** - Modal for creating/editing meals
- **IngredientSection** - Component for each Pinggang Pinoy category
- **MealCard** - Individual meal display card
- **MealFiltersComponent** - Search and filtering interface
- **AddIngredientModal** - Modal for adding new ingredients

### Key Features:
- **Responsive Design** - Works on desktop and mobile
- **Real-time Updates** - Immediate feedback on actions
- **Smart Filtering** - Multiple filter combinations
- **Price Calculation** - Automatic meal cost estimation
- **Data Validation** - Form validation and error handling

## Pinggang Pinoy Categories

### Go Foods (Energy - Yellow)
Carbohydrates that provide energy for daily activities
- Examples: Rice, bread, pasta, sweet potato, oats

### Grow Foods (Build - Red)  
Proteins for muscle and tissue building
- Examples: Chicken, fish, eggs, beans, milk, tofu

### Glow Foods (Protect - Green)
Vitamins and minerals for immunity and health
- Examples: Vegetables, fruits, leafy greens

## Usage Instructions

### Creating a New Meal:
1. Click "Add New Meal" button
2. Fill in meal details (name, category, picture, recipe)
3. Select dietary tags as needed
4. Add ingredients from each Pinggang Pinoy category:
   - Browse existing ingredients or add new ones
   - Specify quantities (e.g., "250g", "1 cup", "2 pieces")
5. Review estimated price calculation
6. Save the meal

### Managing Meals:
- **Edit**: Click edit button on any meal card
- **Archive**: Click archive to hide from main view
- **Restore**: Switch to archived view and restore meals
- **Filter**: Use the filters panel to find specific meals

### Adding Ingredients:
- Click "Add New" in any ingredient section
- Specify name, category, price per kilo, and optional image
- New ingredients become available immediately

## Technical Implementation

### TypeScript Types:
All components are fully typed with comprehensive interfaces for type safety.

### Supabase Integration:
- Real-time database operations
- Optimized queries with joins for performance
- Error handling and validation

### State Management:
- React hooks for local state
- Proper cleanup and effect management
- Loading states and error handling

### UI/UX:
- Tailwind CSS for styling
- Lucide React icons
- Responsive grid layouts
- Interactive form components

## Future Enhancements

### Potential Additions:
1. **Nutritional Information**: Add macro/micronutrient tracking
2. **Meal Planning**: Weekly meal plan creation
3. **Shopping Lists**: Generate shopping lists from meals
4. **Recipe Sharing**: Export/import meal recipes
5. **Photo Upload**: Direct image upload for meals and ingredients
6. **Batch Operations**: Bulk edit/archive operations
7. **Advanced Analytics**: Meal cost trends and nutrition analysis

## Setup & Development

1. **Database Setup**: Run the SQL script to create tables
2. **Environment**: Configure Supabase credentials
3. **Development**: Run `bun dev` to start the development server
4. **Build**: Run `bun build` for production build

The system is designed to be scalable and maintainable, with clear separation of concerns and comprehensive error handling throughout.
