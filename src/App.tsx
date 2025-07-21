
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ModalProvider, useModal } from './contexts/ModalContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginForm } from './components/LoginForm'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'
import { HistoryPage } from './pages/HistoryPage'
import { CreateUserModal } from './components/CreateUserModal'
import { CreateEditMealModal } from './components/CreateEditMealModal'
import { CreateEditIngredientModal } from './components/CreateEditIngredientModal'
import { IngredientsPage } from './pages/IngredientsPage'
import './index.css'
import { MealCurationPage } from './pages/MealCurationPage'
import { Toaster } from "@/components/ui/sonner"
import { GrantPage } from './pages/GrantPage'

function AppContent() {
  const {
    showCreateUserModal,
    closeCreateUserModal,
    onUserCreated,
    showCreateEditMealModal,
    editingMeal,
    closeCreateEditMealModal,
    onMealSaved,
    showCreateEditIngredientModal,
    editingIngredient,
    initialIngredientCategory,
    closeCreateEditIngredientModal,
    onIngredientSaved
  } = useModal();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="mealcuration" element={<MealCurationPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="ingredients" element={<IngredientsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="grants" element={<GrantPage />} />
          
          {/* Nested routes for modals */}
          
          {/* Catch-all route to redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {/* Global Modals */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={closeCreateUserModal}
        onUserCreated={onUserCreated}
      />

      <CreateEditMealModal
        isOpen={showCreateEditMealModal}
        onClose={closeCreateEditMealModal}
        onMealSaved={onMealSaved}
        editingMeal={editingMeal}
      />

      <CreateEditIngredientModal
        isOpen={showCreateEditIngredientModal}
        onClose={closeCreateEditIngredientModal}
        onIngredientSaved={onIngredientSaved}
        editingIngredient={editingIngredient}
        initialCategory={initialIngredientCategory}
      />
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <AppContent />
        <Toaster />
      </ModalProvider>
    </AuthProvider>
  )
}

export default App
