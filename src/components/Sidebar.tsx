import { NavLink, useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  Settings,
  ChefHat,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  Apple,
  Salad,
  History
} from 'lucide-react'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'users', label: 'User Management', icon: Users, path: '/users' },
  { id: 'mealcuration', label: 'Meal Curation', icon: Salad, path: '/mealcuration' },
  { id: 'ingredients', label: 'Ingredients', icon: Apple, path: '/ingredients' },
  { id: 'history', label: 'Activity History', icon: History, path: '/history' },
  { id: 'grants', label: 'Grants', icon: ChefHat, path: '/grants' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  isCollapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

export const Sidebar = ({ isOpen, onToggle, isCollapsed, onCollapsedChange }: SidebarProps) => {
  const { user, userRole, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // All users can access all menu items
  const filteredMenuItems = menuItems;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        ${isCollapsed ? 'w-16' : 'w-64'}
        fixed inset-y-0 left-0 z-50 bg-white transform border transition-all duration-300 ease-in-out 
        md:translate-x-0 md:static md:inset-0
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-black">
              Kusinaries
            </h2>
          )}
          <div className="flex items-center space-x-2">
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={onToggle}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex"
              onClick={() => onCollapsedChange(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-4 space-y-1 px-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    onToggle()
                  }
                }}
                className={({ isActive }) => `
                  flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200
                  ${isActive
                    ? 'bg-gray-100 text-black'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <Icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
                {!isCollapsed && (
                  <span className="transition-opacity duration-200">{item.label}</span>
                )}
                {isCollapsed && (
                  <span className="sr-only">{item.label}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User Info & Sign Out */}
        <div className="border-t p-4 space-y-3">
          {!isCollapsed && (
            <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-white">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email?.split('@')[0]}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isAdmin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {userRole || 'user'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleSignOut}
            className={`w-full ${isCollapsed ? 'px-0' : ''}`}
            size={isCollapsed ? "sm" : "default"}
          >
            <LogOut className={`h-4 w-4 ${isCollapsed ? '' : 'mr-2'}`} />
            {!isCollapsed && 'Sign Out'}
            {isCollapsed && <span className="sr-only">Sign Out</span>}
          </Button>
        </div>
      </div>
    </>
  )
}
