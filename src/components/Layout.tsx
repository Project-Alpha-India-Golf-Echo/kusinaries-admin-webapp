import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { BUILD, shortVersion } from '../lib/version'
import { CacheDebugPanel } from './CacheDebugPanel'
import { Sidebar } from './Sidebar'

export const Layout = () => {
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
        <main className="flex-1 overflow-y-auto bg-white flex flex-col">
          <div className="p-4 md:p-6 flex-1">
            <div className="w-full h-full">
              <Outlet />
            </div>
          </div>
          <footer className="px-4 md:px-6 py-2 border-t text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 items-center justify-between">
            <span>Version: {shortVersion()}</span>
            <span className="hidden sm:inline">Built: {new Date(BUILD.buildTime).toLocaleString() === 'Invalid Date' ? BUILD.buildTime : new Date(BUILD.buildTime).toLocaleString()}</span>
            <span className="hidden md:inline">Branch: {BUILD.gitBranch}</span>
            <span className="hidden lg:inline">Commit: {BUILD.gitCommit}</span>
          </footer>
        </main>
      </div>

      {/* Cache Debug Panel - only show in development */}
      {process.env.NODE_ENV === 'development' && <CacheDebugPanel />}
    </div>
  )
}
