
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ModalProvider, useModal } from './contexts/ModalContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginForm } from './components/LoginForm'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'
import { CreateUserModal } from './components/CreateUserModal'
import { CreateEditMealModal } from './components/CreateEditMealModal'
import { AddIngredientModal } from './components/AddIngredientModal'
import './index.css'
import { MealCurationPage } from './pages/MealCurationPage'

function AppContent() {
  const { 
    showCreateUserModal, 
    closeCreateUserModal, 
    onUserCreated,
    showCreateEditMealModal,
    editingMeal,
    closeCreateEditMealModal,
    onMealSaved,
    showAddIngredientModal,
    initialIngredientCategory,
    closeAddIngredientModal,
    onIngredientAdded
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
      
      <AddIngredientModal
        isOpen={showAddIngredientModal}
        onClose={closeAddIngredientModal}
        onIngredientAdded={onIngredientAdded}
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
      </ModalProvider>
    </AuthProvider>
  )
}

export default App
