import { createContext, useContext, useState } from 'react';
import type { Condiment, Cook, Ingredient, IngredientCategory, Meal, User } from '../types';

interface ModalContextType {
  // User modals
  showCreateUserModal: boolean;
  openCreateUserModal: () => void;
  closeCreateUserModal: () => void;
  onUserCreated: () => void;
  // Edit user modal
  showEditUserModal: boolean;
  editingUser: User | null;
  openEditUserModal: (user: User) => void;
  closeEditUserModal: () => void;
  onUserUpdated: (updated: Partial<User> & { id: string }) => void;
  
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

  // Ingredient management modal
  showIngredientManagementModal: boolean;
  openIngredientManagementModal: () => void;
  closeIngredientManagementModal: () => void;

  // Condiment modals
  showCreateEditCondimentModal: boolean;
  editingCondiment: Condiment | null;
  openCreateCondimentModal: () => void;
  openEditCondimentModal: (condiment: Condiment) => void;
  closeCreateEditCondimentModal: () => void;
  onCondimentSaved: () => void;

  // Condiment management modal
  showCondimentManagementModal: boolean;
  openCondimentManagementModal: () => void;
  closeCondimentManagementModal: () => void;

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
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Meal modal state
  const [showCreateEditMealModal, setShowCreateEditMealModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  // Ingredient modal state
  const [showCreateEditIngredientModal, setShowCreateEditIngredientModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [initialIngredientCategory, setInitialIngredientCategory] = useState<IngredientCategory | undefined>(undefined);
  
  // Ingredient management modal state
  const [showIngredientManagementModal, setShowIngredientManagementModal] = useState(false);
  
  // Condiment modal state
  const [showCreateEditCondimentModal, setShowCreateEditCondimentModal] = useState(false);
  const [editingCondiment, setEditingCondiment] = useState<Condiment | null>(null);
  
  // Condiment management modal state
  const [showCondimentManagementModal, setShowCondimentManagementModal] = useState(false);
  
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

  // Edit user modal functions
  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    setShowEditUserModal(true);
  };
  const closeEditUserModal = () => {
    setShowEditUserModal(false);
    setEditingUser(null);
  };
  const onUserUpdated = (updated: Partial<User> & { id: string }) => {
    window.dispatchEvent(new CustomEvent('userUpdated', { detail: updated }));
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

  // Ingredient management modal functions
  const openIngredientManagementModal = () => setShowIngredientManagementModal(true);
  const closeIngredientManagementModal = () => setShowIngredientManagementModal(false);

  // Condiment modal functions
  const openCreateCondimentModal = () => {
    setEditingCondiment(null);
    setShowCreateEditCondimentModal(true);
  };

  const openEditCondimentModal = (condiment: Condiment) => {
    setEditingCondiment(condiment);
    setShowCreateEditCondimentModal(true);
  };

  const closeCreateEditCondimentModal = () => {
    setShowCreateEditCondimentModal(false);
    setEditingCondiment(null);
  };

  const onCondimentSaved = () => {
    // Trigger a refresh event that components can listen to
    window.dispatchEvent(new CustomEvent('condimentSaved'));
  };

  // Condiment management modal functions
  const openCondimentManagementModal = () => setShowCondimentManagementModal(true);
  const closeCondimentManagementModal = () => setShowCondimentManagementModal(false);

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
  showEditUserModal,
  editingUser,
  openEditUserModal,
  closeEditUserModal,
  onUserUpdated,
        
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

        // Ingredient management modal
        showIngredientManagementModal,
        openIngredientManagementModal,
        closeIngredientManagementModal,

        // Condiment modals
        showCreateEditCondimentModal,
        editingCondiment,
        openCreateCondimentModal,
        openEditCondimentModal,
        closeCreateEditCondimentModal,
        onCondimentSaved,

        // Condiment management modal
        showCondimentManagementModal,
        openCondimentManagementModal,
        closeCondimentManagementModal,

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
