import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Button } from './ui/button'
import { Sidebar } from './Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { Menu } from 'lucide-react'

export const Layout = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="p-4 md:p-6 h-full">
            <div className="w-full h-full">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
