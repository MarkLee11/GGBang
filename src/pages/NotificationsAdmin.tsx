// === File: src/pages/NotificationsAdmin.tsx ===
import React, { useEffect, useMemo, useState } from 'react'
import { peekQueue, requeueFailed, requeueOne, type QueueItem, type Kind } from '../lib/notificationsAdmin'
import { toast } from 'react-hot-toast'
// 文件位置：src/pages/NotificationsAdmin.tsx

import React, { useState } from 'react';

const NotificationsAdmin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);

    try {
      // 1. 插入一条测试记录到 notifications_queue
      const queueRes = await fetch(
        'https://lymybduvqtbmaukhifzx.supabase.co/rest/v1/notifications_queue',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXliZHV2cXRibWF1a2hpZnp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMwNzQzOSwiZXhwIjoyMDY5ODgzNDM5fQ.irOhetgBP8dDz90QqUZvDrkdQqC8Dsy25RVh-hLQxg0',
            Authorization:
              'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXliZHV2cXRibWF1a2hpZnp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMwNzQzOSwiZXhwIjoyMDY5ODgzNDM5fQ.irOhetgBP8dDz90QqUZvDrkdQqC8Dsy25RVh-hLQxg0'
          },
          body: JSON.stringify([
            {
              kind: 'request_created',
              event_id: 24,
              join_request_id: 9,
              requester_id: '29f1cca3-4ddf-47d9-9f5e-6f5e06071198',
              host_id: '7361e2f9-5f63-4dcb-b32e-e7f2c9262ae0',
              payload: { note: '这是一个链路测试，不必回复' },
              status: 'queued',
              attempts: 0
            }
          ])
        }
      );

      if (!queueRes.ok) {
        throw new Error(`Queue insert failed: ${queueRes.status}`);
      }

      // 2. 调用 notify-worker 处理
      const workerRes = await fetch(
        'https://lymybduvqtbmaukhifzx.functions.supabase.co/notify-worker',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXliZHV2cXRibWF1a2hpZnp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMwNzQzOSwiZXhwIjoyMDY5ODgzNDM5fQ.irOhetgBP8dDz90QqUZvDrkdQqC8Dsy25RVh-hLQxg0',
            'x-cron-secret': 'sk_cron_F8t6qH2yPz7dK9mQJ4wXb1NcRe5Va3Lg'
          },
          body: '{}'
        }
      );

      const workerJson = await workerRes.json();
      setResult(JSON.stringify(workerJson, null, 2));
    } catch (err: any) {
      setResult(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">📬 Notifications Admin</h1>

      <button
        onClick={runTest}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded mb-4"
      >
        {loading ? 'Running Test...' : 'Run AI + Email Chain Test'}
      </button>

      {result && (
        <pre className="bg-gray-900 p-4 rounded text-sm overflow-auto">
          {result}
        </pre>
      )}
    </div>
  );
};

export default NotificationsAdmin;

export default function NotificationsAdmin() {
  const [adminSecret, setAdminSecret] = useState<string>('')
  const [limit, setLimit] = useState<number>(50)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<{ queued: number; processing: number; sent: number; failed: number } | null>(null)
  const [recent, setRecent] = useState<QueueItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // filters for requeue_failed
  const [filterKind, setFilterKind] = useState<Kind | ''>('')
  const [filterEventId, setFilterEventId] = useState<string>('')
  const [sinceHours, setSinceHours] = useState<number>(24)
  const [rfLimit, setRfLimit] = useState<number>(100)
  const [resetAttempts, setResetAttempts] = useState<boolean>(true)

  const opts = useMemo(() => ({ adminSecret: adminSecret.trim() || undefined }), [adminSecret])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await peekQueue(limit, opts)
      if (!res.ok) {
        setError(res.error || 'Failed to peek')
        toast.error(res.error || 'Failed to peek')
        return
      }
      setSummary(res.summary ?? { queued: 0, processing: 0, sent: 0, failed: 0 })
      setRecent(res.recent ?? [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
      toast.error(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 初次不自动拉，等你点按钮或手动输入密钥
  }, [])

  async function onRequeueFailed() {
    setLoading(true)
    setError(null)
    try {
      const payload: any = {
        since_hours: sinceHours,
        limit: rfLimit,
        reset_attempts: resetAttempts,
      }
      if (filterKind) payload.kind = filterKind
      if (filterEventId) payload.event_id = Number(filterEventId)

      const res = await requeueFailed(payload, opts)
      if (!res.ok) {
        toast.error(res.error || 'Requeue failed')
      } else {
        toast.success(`Requeued ${res.requeued ?? 0} tasks`)
      }
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Requeue failed')
    } finally {
      setLoading(false)
    }
  }

  async function onRequeueOne(id: number) {
    setLoading(true)
    try {
      const res = await requeueOne(id, true, opts)
      if (!res.ok) {
        toast.error(res.error || `Requeue #${id} failed`)
      } else {
        toast.success(`Requeued #${id}`)
      }
      await load()
    } catch (e: any) {
      toast.error(e?.message || `Requeue #${id} failed`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Notifications Admin</h1>

      <section className="grid md:grid-cols-3 gap-4 items-end">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600">x-admin-secret（可选）</label>
          <input
            type="password"
            placeholder="sk_admin_xxx"
            className="border rounded px-3 py-2"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
          />
          <small className="text-gray-500">如果函数配置了 ADMIN_SECRET，这里填同样的值。</small>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600">Peek limit</label>
          <input
            type="number"
            min={1}
            max={200}
            className="border rounded px-3 py-2"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value || 50))}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CardStat label="Queued" value={summary.queued} />
          <CardStat label="Processing" value={summary.processing} />
          <CardStat label="Sent" value={summary.sent} />
          <CardStat label="Failed" value={summary.failed} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Requeue failed</h2>
        <div className="grid md:grid-cols-5 gap-3">
          <select
            className="border rounded px-3 py-2"
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value as Kind | '')}
          >
            <option value="">All kinds</option>
            <option value="request_created">request_created</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="location_unlocked">location_unlocked</option>
          </select>

          <input
            className="border rounded px-3 py-2"
            type="number"
            placeholder="event_id (optional)"
            value={filterEventId}
            onChange={(e) => setFilterEventId(e.target.value)}
          />

          <input
            className="border rounded px-3 py-2"
            type="number"
            min={1}
            max={24 * 365}
            value={sinceHours}
            onChange={(e) => setSinceHours(Number(e.target.value || 24))}
          />

          <input
            className="border rounded px-3 py-2"
            type="number"
            min={1}
            max={1000}
            value={rfLimit}
            onChange={(e) => setRfLimit(Number(e.target.value || 100))}
          />

          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={resetAttempts} onChange={(e) => setResetAttempts(e.target.checked)} />
            <span className="text-sm">reset attempts</span>
          </label>
        </div>

        <button
          onClick={onRequeueFailed}
          disabled={loading}
          className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-60"
        >
          {loading ? 'Requeueing…' : 'Requeue failed batch'}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Recent</h2>
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>ID</Th>
                <Th>Kind</Th>
                <Th>Status</Th>
                <Th>Attempts</Th>
                <Th>Event</Th>
                <Th>JoinReq</Th>
                <Th>Requester</Th>
                <Th>Host</Th>
                <Th>Created</Th>
                <Th>Last Error</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t">
                  <Td>{r.id}</Td>
                  <Td className="font-medium">{r.kind}</Td>
                  <Td>
                    <Badge status={r.status} />
                  </Td>
                  <Td>{r.attempts}</Td>
                  <Td>{r.event_id ?? '-'}</Td>
                  <Td>{r.join_request_id ?? '-'}</Td>
                  <Td className="font-mono text-xs">{r.requester_id ?? '-'}</Td>
                  <Td className="font-mono text-xs">{r.host_id ?? '-'}</Td>
                  <Td>{new Date(r.created_at).toLocaleString()}</Td>
                  <Td className="max-w-[240px] truncate" title={r.last_error ?? ''}>
                    {r.last_error ?? '-'}
                  </Td>
                  <Td>
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => onRequeueOne(r.id)}
                      disabled={loading}
                      title="Requeue this item"
                    >
                      Requeue
                    </button>
                  </Td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <Td colSpan={11} className="text-center text-gray-500 py-8">
                    No data. Click Refresh.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </section>
    </div>
  )
}

function CardStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

function Badge({ status }: { status: QueueItem['status'] }) {
  const map: Record<QueueItem['status'], string> = {
    queued: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }
  return <span className={`px-2 py-0.5 rounded text-xs ${map[status]}`}>{status}</span>
}

function Th({ children }: React.PropsWithChildren) {
  return <th className="text-left px-3 py-2 font-medium">{children}</th>
}
function Td({ children, className = '', colSpan }: React.PropsWithChildren & { className?: string; colSpan?: number }) {
  return (
    <td className={`px-3 py-2 align-top ${className}`} colSpan={colSpan}>
      {children}
    </td>
  )
}
