'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  actor_id: string
  target_user_id: string | null
  details: Record<string, any>
  created_at: string
  actor?: {
    full_name: string
  }
  target_user?: {
    full_name: string
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterAction, setFilterAction] = useState<string>('all')

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/audit-logs')
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Failed to load audit logs')
      }

      setLogs(body.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const uniqueActions = Array.from(new Set(logs.map(log => log.action)))

  const filteredLogs = filterAction === 'all'
    ? logs
    : logs.filter(log => log.action === filterAction)

  const getActionBadgeColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-100 text-green-800'
    if (action.includes('deleted') || action.includes('deactivated')) return 'bg-red-100 text-red-800'
    if (action.includes('updated') || action.includes('activated')) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  const formatActionLabel = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatDetails = (log: AuditLog) => {
    const d = log.details
    if (!d || typeof d !== 'object') return null

    if (log.action === 'user_deleted') {
      const name = (d as any).removed_user_name ?? (d as any).full_name ?? 'Unknown'
      return (
        <div className="space-y-1 text-sm">
          <p className="font-medium text-gray-800">
            Removed user: {name}
          </p>
          {(d as any).phone_number != null && (
            <p className="text-gray-600">Phone: {(d as any).phone_number}</p>
          )}
          {(d as any).role != null && (
            <p className="text-gray-600">Role: {(d as any).role}</p>
          )}
        </div>
      )
    }

    const fromToKeys = ['full_name', 'phone_number', 'role', 'is_active']
    const lines: string[] = []
    for (const key of fromToKeys) {
      const v = (d as any)[key]
      if (v && typeof v === 'object' && 'from' in v && 'to' in v) {
        const fromVal = String(v.from)
        const toVal = String(v.to)
        const label = key.replace(/_/g, ' ')
        lines.push(`${label}: ${fromVal} → ${toVal}`)
      }
    }
    if (lines.length > 0) {
      return (
        <div className="space-y-1 text-sm">
          {lines.map((line, i) => (
            <p key={i} className="text-gray-700 font-mono text-xs">
              {line}
            </p>
          ))}
        </div>
      )
    }

    if (Object.keys(d).length > 0 && !(d as any)._note) {
      return (
        <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
          {JSON.stringify(d, null, 2)}
        </pre>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-gray-600 mt-2">System activity and user action history</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filter */}
      <div className="mb-6">
        <h2 className="font-semibold mb-3">Filter by Action</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterAction('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterAction === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            All Actions
          </button>
          {uniqueActions.map((action) => (
            <button
              key={action}
              onClick={() => setFilterAction(action)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                filterAction === action
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {formatActionLabel(action)}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Timeline */}
      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-600">
            No audit logs found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Time */}
                  <div className="flex-shrink-0 md:w-32">
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionBadgeColor(log.action)}`}>
                        {formatActionLabel(log.action)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-700 space-y-1">
                      <p>
                        <span className="font-medium">Actor:</span>{' '}
                        {log.actor?.full_name || 'Unknown'}
                      </p>
                      {log.action === 'user_deleted' && log.details?.removed_user_name ? (
                        <p>
                          <span className="font-medium">Removed user:</span>{' '}
                          {log.details.removed_user_name}
                        </p>
                      ) : log.target_user && (
                        <p>
                          <span className="font-medium">Target:</span>{' '}
                          {log.target_user.full_name}
                        </p>
                      )}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="cursor-pointer">
                          <summary className="font-medium text-gray-600 hover:text-gray-900">
                            Additional Details
                          </summary>
                          <div className="mt-2 p-2 bg-gray-50 rounded">
                            {formatDetails(log)}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>

                  {/* ID */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-mono text-gray-500 break-all">{log.id.slice(0, 8)}...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
