
import { Toaster } from "@/components/ui/sonner"
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import CookDetailsModal from './components/CookDetailsModal'
import { CreateEditIngredientModal } from './components/CreateEditIngredientModal'
import { CreateEditMealModal } from './components/CreateEditMealModal'
import { CreateUserModal } from './components/CreateUserModal'
import { EditUserModal } from './components/EditUserModal'
import { Layout } from './components/Layout'
import { LoginForm } from './components/LoginForm'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { ModalProvider, useModal } from './contexts/ModalContext'
import './index.css'
import { DashboardPage } from './pages/DashboardPage'
import { GrantPage } from './pages/GrantPage'
import { HistoryPage } from './pages/HistoryPage'
import { IngredientsPage } from './pages/IngredientsPage'
import { MealCurationPage } from './pages/MealCurationPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'

function AppContent() {
  const {
    showCreateUserModal,
    closeCreateUserModal,
    onUserCreated,
  showEditUserModal,
  editingUser,
  closeEditUserModal,
  onUserUpdated,
    showCreateEditMealModal,
    editingMeal,
    closeCreateEditMealModal,
    onMealSaved,
    showCreateEditIngredientModal,
    editingIngredient,
    initialIngredientCategory,
    closeCreateEditIngredientModal,
  onIngredientSaved,
  showCookDetailsModal,
  selectedCook,
  closeCookDetails
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

      <EditUserModal
        isOpen={showEditUserModal}
        onClose={closeEditUserModal}
        user={editingUser}
        onUserUpdated={onUserUpdated}
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

      <CookDetailsModal
        cook={selectedCook}
        open={showCookDetailsModal}
        onClose={closeCookDetails}
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
