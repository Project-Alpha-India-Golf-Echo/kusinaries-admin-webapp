import { useAuth } from '../contexts/AuthContext'

export const DashboardPage = () => {
  const { user } = useAuth()
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-black">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, <span className="font-medium">{user?.email?.split('@')[0]}</span>! Here's what's happening with your application.
        </p>
      </div>
    </div>
  )
}
