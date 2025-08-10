import React, { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, AlertCircle, Eye, RefreshCw, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatEventDate, formatEventDateTime } from '../utils/dateUtils'

interface UnlockLog {
  id: number
  event_id: number
  event_title: string
  action: 'unlocked' | 'error' | 'skipped'
  details: string | null
  unlocked_at: string
  created_at: string
}

interface UnlockStats {
  total_logs: number
  unlocked_today: number
  errors_today: number
  last_run: string | null
}

export const UnlockMonitoringDashboard: React.FC = () => {
  const [logs, setLogs] = useState<UnlockLog[]>([])
  const [stats, setStats] = useState<UnlockStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d'>('24h')

  const fetchUnlockData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Calculate time range based on selection
      const timeRanges = {
        '1h': new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        '24h': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }

      // Fetch unlock logs
      const { data: logsData, error: logsError } = await supabase
        .from('location_unlock_logs')
        .select('*')
        .gte('unlocked_at', timeRanges[selectedTimeframe])
        .order('unlocked_at', { ascending: false })
        .limit(100)

      if (logsError) throw logsError

      setLogs(logsData || [])

      // Calculate stats
      const today = new Date().toISOString().split('T')[0]
      const todayLogs = (logsData || []).filter(log => 
        log.unlocked_at.startsWith(today)
      )

      const stats: UnlockStats = {
        total_logs: logsData?.length || 0,
        unlocked_today: todayLogs.filter(log => log.action === 'unlocked').length,
        errors_today: todayLogs.filter(log => log.action === 'error').length,
        last_run: logsData?.[0]?.unlocked_at || null
      }

      setStats(stats)

    } catch (err) {
      console.error('Error fetching unlock data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch unlock data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnlockData()
  }, [selectedTimeframe])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'unlocked':
        return <CheckCircle size={16} className="text-green-400" />
      case 'error':
        return <XCircle size={16} className="text-red-400" />
      case 'skipped':
        return <Clock size={16} className="text-yellow-400" />
      default:
        return <AlertCircle size={16} className="text-gray-400" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'unlocked':
        return 'border-green-500/30 bg-green-500/10'
      case 'error':
        return 'border-red-500/30 bg-red-500/10'
      case 'skipped':
        return 'border-yellow-500/30 bg-yellow-500/10'
      default:
        return 'border-gray-500/30 bg-gray-500/10'
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <span className="ml-3 text-gray-400">Loading unlock activity...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center py-8">
          <XCircle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button 
            onClick={fetchUnlockData}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
            <Eye size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Location Unlock Monitoring</h2>
            <p className="text-gray-400 text-sm">Automated unlock activity and status</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Timeframe Selector */}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          
          {/* Refresh Button */}
          <button
            onClick={fetchUnlockData}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3">
              <Calendar size={20} className="text-blue-400" />
              <div>
                <p className="text-gray-400 text-sm">Total Activity</p>
                <p className="text-white font-semibold">{stats.total_logs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3">
              <CheckCircle size={20} className="text-green-400" />
              <div>
                <p className="text-gray-400 text-sm">Unlocked Today</p>
                <p className="text-white font-semibold">{stats.unlocked_today}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3">
              <XCircle size={20} className="text-red-400" />
              <div>
                <p className="text-gray-400 text-sm">Errors Today</p>
                <p className="text-white font-semibold">{stats.errors_today}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3">
              <Clock size={20} className="text-purple-400" />
              <div>
                <p className="text-gray-400 text-sm">Last Run</p>
                <p className="text-white font-semibold text-xs">
                  {stats.last_run ? 
                    new Date(stats.last_run).toLocaleTimeString() : 
                    'Never'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Recent Activity</h3>
          <p className="text-gray-400 text-sm">
            Showing {logs.length} activities from the {selectedTimeframe === '1h' ? 'last hour' : selectedTimeframe === '24h' ? 'last 24 hours' : 'last 7 days'}
          </p>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center">
              <Clock size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No unlock activity in the selected timeframe</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 border-l-4 ${getActionColor(log.action)} transition-colors hover:bg-gray-700/30`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getActionIcon(log.action)}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">{log.event_title}</p>
                        <p className="text-gray-400 text-sm capitalize">
                          {log.action.replace('_', ' ')}
                          {log.details && ` - ${log.details}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{formatEventDateTime(log.unlocked_at)}</p>
                      <p className="text-xs">Event ID: {log.event_id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-3">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-gray-300 text-sm">Automated unlock system active</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span className="text-gray-300 text-sm">Monitoring every 5 minutes</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
            <span className="text-gray-300 text-sm">1-hour unlock window (55-65 min before)</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span className="text-gray-300 text-sm">Idempotent operations</span>
          </div>
        </div>
      </div>
    </div>
  )
}
