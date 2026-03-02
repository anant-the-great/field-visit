'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, LogOut, FileText, Users, History, User } from 'lucide-react'

interface NavBarProps {
  userRole?: 'collection_manager' | 'field_agent'
  userName?: string
}

export function LeftNavBar({ userRole, userName }: NavBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    router.push('/login')
  }

  const navItems = userRole === 'collection_manager' ? [
    { href: '/collection-manager/all-visits', label: 'All Visits', icon: FileText },
    { href: '/collection-manager/user-management', label: 'User Management', icon: Users },
    { href: '/collection-manager/audit-logs', label: 'Audit Logs', icon: History },
    { href: '/collection-manager/profile', label: 'Profile', icon: User },
  ] : [
    { href: '/field-agent/new-visit', label: 'New Visit', icon: FileText },
    { href: '/field-agent/profile', label: 'Profile', icon: User },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href)

  const NavContent = () => (
    <>
      <div className="flex-1">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t pt-4 space-y-3">
        {userName && (
          <div className="px-4 py-2 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Logged in as</p>
            <p className="font-semibold text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-500 capitalize">
              {userRole === 'collection_manager' ? 'Collection Manager' : 'Field Agent'}
            </p>
          </div>
        )}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger menu button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg md:hidden"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      )}

      {/* Sidebar - Desktop: always visible, Mobile: overlay */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 z-40 md:relative md:translate-x-0 ${
          isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-600">Visit Tracker</h1>
          <p className="text-xs text-gray-500 mt-1">Loan Collection System</p>
        </div>

        {/* Navigation content */}
        <div className="flex-1 overflow-y-auto p-4">
          <NavContent />
        </div>
      </aside>

      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}
    </>
  )
}
