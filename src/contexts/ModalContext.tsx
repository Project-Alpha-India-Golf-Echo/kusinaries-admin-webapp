import { createContext, useContext, useState } from 'react';
import type { Meal, IngredientCategory } from '../types';

interface ModalContextType {
  // User modals
  showCreateUserModal: boolean;
  openCreateUserModal: () => void;
  closeCreateUserModal: () => void;
  onUserCreated: () => void;
  
  // Meal curation modals
  showCreateEditMealModal: boolean;
  editingMeal: Meal | null;
  openCreateMealModal: () => void;
  openEditMealModal: (meal: Meal) => void;
  closeCreateEditMealModal: () => void;
  onMealSaved: () => void;
  
  showAddIngredientModal: boolean;
  initialIngredientCategory: IngredientCategory | undefined;
  openAddIngredientModal: (category?: IngredientCategory) => void;
  closeAddIngredientModal: () => void;
  onIngredientAdded: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  // User modal state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // Meal modal state
  const [showCreateEditMealModal, setShowCreateEditMealModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  // Ingredient modal state
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [initialIngredientCategory, setInitialIngredientCategory] = useState<IngredientCategory | undefined>(undefined);

  // User modal functions
  const openCreateUserModal = () => setShowCreateUserModal(true);
  const closeCreateUserModal = () => setShowCreateUserModal(false);
  
  const onUserCreated = () => {
    // Trigger a refresh event that components can listen to
    window.dispatchEvent(new CustomEvent('userCreated'));
  };

  // Meal modal functions
  const openCreateMealModal = () => {
    setEditingMeal(null);
    setShowCreateEditMealModal(true);
  };

  const openEditMealModal = (meal: Meal) => {
    setEditingMeal(meal);
    setShowCreateEditMealModal(true);
  };

  const closeCreateEditMealModal = () => {
    setShowCreateEditMealModal(false);
    setEditingMeal(null);
  };

  const onMealSaved = () => {
    // Trigger a refresh event that components can listen to
    window.dispatchEvent(new CustomEvent('mealSaved'));
  };

  // Ingredient modal functions
  const openAddIngredientModal = (category?: IngredientCategory) => {
    setInitialIngredientCategory(category);
    setShowAddIngredientModal(true);
  };

  const closeAddIngredientModal = () => {
    setShowAddIngredientModal(false);
    setInitialIngredientCategory(undefined);
  };

  const onIngredientAdded = () => {
    // Trigger a refresh event that components can listen to
    window.dispatchEvent(new CustomEvent('ingredientAdded'));
  };

  return (
    <ModalContext.Provider
      value={{
        // User modals
        showCreateUserModal,
        openCreateUserModal,
        closeCreateUserModal,
        onUserCreated,
        
        // Meal modals
        showCreateEditMealModal,
        editingMeal,
        openCreateMealModal,
        openEditMealModal,
        closeCreateEditMealModal,
        onMealSaved,
        
        // Ingredient modals
        showAddIngredientModal,
        initialIngredientCategory,
        openAddIngredientModal,
        closeAddIngredientModal,
        onIngredientAdded,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
