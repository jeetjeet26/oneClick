'use client'

import { useState, useEffect } from 'react'
import {
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Plus,
  Unplug,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Loader2,
  Clock
} from 'lucide-react'

interface SocialConnection {
  id: string
  platform: string
  account_id: string
  account_name: string
  account_username: string
  account_avatar_url: string | null
  is_active: boolean
  scopes: string[]
  token_expires_at: string | null
  last_used_at: string | null
  last_error: string | null
  created_at: string
  needs_refresh: boolean
}

interface SocialConnectionsProps {
  propertyId: string
}

const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'from-pink-500 to-purple-600',
    bgColor: 'bg-gradient-to-r from-pink-500 to-purple-600',
    textColor: 'text-pink-600',
    description: 'Post photos and reels to Instagram',
    available: true
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'from-blue-600 to-blue-700',
    bgColor: 'bg-blue-600',
    textColor: 'text-blue-600',
    description: 'Post to your Facebook Page',
    available: true
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'from-blue-700 to-blue-800',
    bgColor: 'bg-blue-700',
    textColor: 'text-blue-700',
    description: 'Share updates on LinkedIn',
    available: false // Coming soon
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: Twitter,
    color: 'from-slate-700 to-slate-900',
    bgColor: 'bg-slate-800',
    textColor: 'text-slate-700',
    description: 'Tweet to your audience',
    available: false // Coming soon
  }
]

export function SocialConnections({ propertyId }: SocialConnectionsProps) {
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  useEffect(() => {
    fetchConnections()
  }, [propertyId])

  const fetchConnections = async () => {
    try {
      const res = await fetch(`/api/forgestudio/social/connections?propertyId=${propertyId}`)
      const data = await res.json()
      setConnections(data.connections || [])
    } catch (error) {
      console.error('Error fetching connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = (platformId: string) => {
    setConnecting(platformId)
    // Redirect to OAuth flow
    window.location.href = `/api/forgestudio/social/connect/${platformId}?propertyId=${propertyId}`
  }

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return

    setDisconnecting(connectionId)
    try {
      await fetch(`/api/forgestudio/social/connections?connectionId=${connectionId}`, {
        method: 'DELETE'
      })
      fetchConnections()
    } catch (error) {
      console.error('Error disconnecting:', error)
    } finally {
      setDisconnecting(null)
    }
  }

  const getConnectionForPlatform = (platformId: string) => {
    return connections.find(c => c.platform === platformId)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Connected Accounts
          </h3>
          <p className="text-sm text-slate-500">
            Connect your social media accounts to publish content directly
          </p>
        </div>
        <button
          onClick={fetchConnections}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon
          const connection = getConnectionForPlatform(platform.id)
          const isConnected = !!connection
          const isConnecting = connecting === platform.id
          const isDisconnecting = disconnecting === connection?.id

          return (
            <div
              key={platform.id}
              className={`bg-white dark:bg-slate-800 rounded-xl border ${
                isConnected
                  ? 'border-green-200 dark:border-green-500/30'
                  : 'border-slate-200 dark:border-slate-700'
              } p-5`}
            >
              <div className="flex items-start gap-4">
                {/* Platform Icon */}
                <div className={`p-3 rounded-xl ${platform.bgColor} text-white`}>
                  <Icon className="w-6 h-6" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      {platform.name}
                    </h4>
                    {isConnected && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {!platform.available && (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>

                  {isConnected ? (
                    <div className="mt-2 space-y-2">
                      {/* Connected Account Info */}
                      <div className="flex items-center gap-2">
                        {connection.account_avatar_url && (
                          <img
                            src={connection.account_avatar_url}
                            alt={connection.account_name}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          @{connection.account_username || connection.account_name}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-3 text-xs">
                        {connection.needs_refresh && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="w-3 h-3" />
                            Token expiring soon
                          </span>
                        )}
                        {connection.last_error && (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            Error
                          </span>
                        )}
                        {connection.last_used_at && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3" />
                            Used {formatDate(connection.last_used_at)}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        {connection.needs_refresh && (
                          <button
                            onClick={() => handleConnect(platform.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Reconnect
                          </button>
                        )}
                        <button
                          onClick={() => handleDisconnect(connection.id)}
                          disabled={isDisconnecting}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                        >
                          {isDisconnecting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Unplug className="w-3 h-3" />
                          )}
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-sm text-slate-500 mb-3">
                        {platform.description}
                      </p>
                      <button
                        onClick={() => handleConnect(platform.id)}
                        disabled={!platform.available || isConnecting}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                          platform.available
                            ? `bg-gradient-to-r ${platform.color} text-white hover:opacity-90`
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        {isConnecting ? 'Connecting...' : 'Connect'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Help Section */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
        <h4 className="font-medium text-slate-900 dark:text-white mb-2">
          📱 How to Connect Instagram
        </h4>
        <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside">
          <li>Your Instagram must be a <strong>Business</strong> or <strong>Creator</strong> account</li>
          <li>Your Instagram must be connected to a <strong>Facebook Page</strong></li>
          <li>Click "Connect" and authorize access through Facebook</li>
          <li>Once connected, you can publish content directly from ForgeStudio!</li>
        </ol>
        <a
          href="https://help.instagram.com/502981923235522"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 mt-3"
        >
          Learn how to set up Instagram Business
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

