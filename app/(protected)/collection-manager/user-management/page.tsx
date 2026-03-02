"use client"

import { useEffect, useState } from "react"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader, UserPlus } from 'lucide-react'

interface User {
  id: string
  full_name: string
  phone_number: string
  role: 'collection_manager' | 'field_agent'
  is_active: boolean
  created_at: string
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [userBeingEdited, setUserBeingEdited] = useState<User | null>(null)
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    phoneNumber: '',
    password: '',
    role: 'field_agent' as 'field_agent' | 'collection_manager',
  })
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [filterRole, setFilterRole] = useState<'all' | 'field_agent' | 'collection_manager'>('all')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/users')
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Failed to load users')
      }

      setUsers(body.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddUserLoading(true)
    setError(null)

    try {
      // Validate inputs
      if (!newUserForm.fullName.trim()) throw new Error('Full name is required')
      if (!newUserForm.phoneNumber.trim()) throw new Error('Phone number is required')
      if (!newUserForm.password.trim()) throw new Error('Password is required')
      if (newUserForm.password.length < 6) throw new Error('Password must be at least 6 characters')

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: newUserForm.fullName,
          phoneNumber: newUserForm.phoneNumber,
          password: newUserForm.password,
          role: newUserForm.role,
        }),
      })

      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Failed to create user')
      }

      // Reset form and reload users
      setNewUserForm({
        fullName: '',
        phoneNumber: '',
        password: '',
        role: 'field_agent',
      })
      setIsAddingUser(false)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setAddUserLoading(false)
    }
  }

  const handleEditClick = (user: User) => {
    setUserBeingEdited(user)
    setIsEditingUser(true)
    setNewUserForm({
      fullName: user.full_name,
      phoneNumber: user.phone_number,
      password: '',
      role: user.role,
    })
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userBeingEdited) return

    setAddUserLoading(true)
    setError(null)

    try {
      if (!newUserForm.fullName.trim()) throw new Error('Full name is required')
      if (!newUserForm.phoneNumber.trim()) throw new Error('Phone number is required')

      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userBeingEdited.id,
          fullName: newUserForm.fullName,
          phoneNumber: newUserForm.phoneNumber,
          role: newUserForm.role,
          isActive: userBeingEdited.is_active,
        }),
      })

      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Failed to update user')
      }

      setUsers(prev =>
        prev.map(u => (u.id === body.user.id ? { ...body.user } : u))
      )
      setIsEditingUser(false)
      setUserBeingEdited(null)
      setNewUserForm({
        fullName: '',
        phoneNumber: '',
        password: '',
        role: 'field_agent',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setAddUserLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      setError(null)

      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Failed to delete user')
      }

      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setError(null)

      const response = await fetch('/api/admin/users/toggle-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          isActive: !currentStatus,
        }),
      })

      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Failed to update user')
      }

      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const filteredUsers = users.filter(
    user => filterRole === 'all' || user.role === filterRole
  )

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-gray-600 mt-2">Create and manage system users</p>
        </div>
        <Button onClick={() => setIsAddingUser(true)} className="md:w-auto">
          <UserPlus className="w-4 h-4 mr-2" />
          Add New User
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Add User Modal */}
      {isAddingUser && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
            <CardDescription>Add a new user to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={newUserForm.fullName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={newUserForm.phoneNumber}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phoneNumber: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as 'field_agent' | 'collection_manager' })}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="field_agent">Field Agent</option>
                    <option value="collection_manager">Collection Manager</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={addUserLoading}>
                  {addUserLoading ? 'Creating...' : 'Create User'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddingUser(false)
                    setNewUserForm({
                      fullName: '',
                      phoneNumber: '',
                      password: '',
                      role: 'field_agent',
                    })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit User Modal */}
      {isEditingUser && userBeingEdited && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle>Edit User</CardTitle>
            <CardDescription>Update user details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="editFullName">Full Name</Label>
                  <Input
                    id="editFullName"
                    value={newUserForm.fullName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editPhoneNumber">Phone Number</Label>
                  <Input
                    id="editPhoneNumber"
                    type="tel"
                    value={newUserForm.phoneNumber}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phoneNumber: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="editRole">Role</Label>
                  <select
                    id="editRole"
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as 'field_agent' | 'collection_manager' })}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="field_agent">Field Agent</option>
                    <option value="collection_manager">Collection Manager</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={addUserLoading}>
                  {addUserLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditingUser(false)
                    setUserBeingEdited(null)
                    setNewUserForm({
                      fullName: '',
                      phoneNumber: '',
                      password: '',
                      role: 'field_agent',
                    })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="mb-6">
        <Label className="text-base font-semibold">Filter by Role</Label>
        <div className="flex gap-2 mt-2">
          {(['all', 'field_agent', 'collection_manager'] as const).map((role) => (
            <Button
              key={role}
              variant={filterRole === role ? 'default' : 'outline'}
              onClick={() => setFilterRole(role)}
              size="sm"
            >
              {role === 'all' ? 'All Users' : role === 'field_agent' ? 'Field Agents' : 'Collection Managers'}
            </Button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-600">
            No users found.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-left font-semibold">Name</th>
                <th className="p-3 text-left font-semibold">Phone</th>
                <th className="p-3 text-left font-semibold">Role</th>
                <th className="p-3 text-left font-semibold">Joined</th>
                <th className="p-3 text-left font-semibold">Status</th>
                <th className="p-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-medium">{user.full_name}</td>
                  <td className="p-3 font-mono text-sm">{user.phone_number}</td>
                  <td className="p-3 capitalize">
                    {user.role === 'field_agent' ? 'Field Agent' : 'Collection Manager'}
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => handleEditClick(user)}
                        size="sm"
                        variant="outline"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                        size="sm"
                        variant="outline"
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        onClick={() => handleDeleteUser(user.id)}
                        size="sm"
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
