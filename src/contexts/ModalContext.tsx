import { createContext, useContext, useState } from 'react';
import type { Cook, Ingredient, IngredientCategory, Meal } from '../types';

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
  
  // Ingredient modals
  showCreateEditIngredientModal: boolean;
  editingIngredient: Ingredient | null;
  initialIngredientCategory: IngredientCategory | undefined;
  openCreateIngredientModal: (category?: IngredientCategory) => void;
  openEditIngredientModal: (ingredient: Ingredient) => void;
  closeCreateEditIngredientModal: () => void;
  onIngredientSaved: () => void;

  // Cook details modal
  showCookDetailsModal: boolean;
  selectedCook: Cook | null;
  openCookDetails: (cook: Cook) => void;
  closeCookDetails: () => void;
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
  const [showCreateEditIngredientModal, setShowCreateEditIngredientModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [initialIngredientCategory, setInitialIngredientCategory] = useState<IngredientCategory | undefined>(undefined);
  // Cook details state
  const [showCookDetailsModal, setShowCookDetailsModal] = useState(false);
  const [selectedCook, setSelectedCook] = useState<Cook | null>(null);

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
  const openCreateIngredientModal = (category?: IngredientCategory) => {
    setEditingIngredient(null);
    setInitialIngredientCategory(category);
    setShowCreateEditIngredientModal(true);
  };

  const openEditIngredientModal = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setInitialIngredientCategory(undefined);
    setShowCreateEditIngredientModal(true);
  };

  const closeCreateEditIngredientModal = () => {
    setShowCreateEditIngredientModal(false);
    setEditingIngredient(null);
    setInitialIngredientCategory(undefined);
  };

  const onIngredientSaved = () => {
    // Trigger a refresh event that components can listen to
    window.dispatchEvent(new CustomEvent('ingredientSaved'));
  };

  // Cook details modal functions
  const openCookDetails = (cook: Cook) => {
    setSelectedCook(cook);
    setShowCookDetailsModal(true);
  };
  const closeCookDetails = () => {
    setShowCookDetailsModal(false);
    setSelectedCook(null);
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
        showCreateEditIngredientModal,
        editingIngredient,
        initialIngredientCategory,
        openCreateIngredientModal,
        openEditIngredientModal,
        closeCreateEditIngredientModal,
        onIngredientSaved,

  // Cook details modal
  showCookDetailsModal,
  selectedCook,
  openCookDetails,
  closeCookDetails,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
