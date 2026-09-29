import { useEffect, useState } from "react"
import {
  ClipboardList, RefreshCw, AlertTriangle, User,
  ShieldAlert, Package, Truck, Target, Siren, X,
} from "lucide-react"
import { getAuditLogs } from "../services/api"

// ============================================================
// HELPERS
// ============================================================

function getIcon(entityType) {
  const t = String(entityType || "").toLowerCase()
  if (t.includes("disaster")) return <AlertTriangle size={15} className="text-red-500" />
  if (t.includes("resource")) return <Package size={15} className="text-orange-500" />
  if (t.includes("vehicle")) return <Truck size={15} className="text-blue-500" />
  if (t.includes("mission")) return <Target size={15} className="text-purple-500" />
  if (t.includes("sos")) return <Siren size={15} className="text-red-600" />
  if (t.includes("user")) return <User size={15} className="text-slate-500" />
  return <ClipboardList size={15} className="text-slate-400" />
}

function timeAgo(ts) {
  if (!ts) return "—"
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString("en-IN")
}

// ============================================================
// AUDIT LOG PAGE
// ============================================================

export default function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [limit, setLimit] = useState(50)

  const loadLogs = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getAuditLogs(limit)
      setLogs(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || "Failed to load audit logs.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLogs() }, [limit])

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
              <ClipboardList size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/60">System Intelligence</p>
              <h1 className="text-3xl font-black">Audit Log</h1>
              <p className="mt-1 text-sm text-white/70">Complete activity trail of all system operations.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm font-bold text-white outline-none"
            >
              <option value={25}>Last 25</option>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
              <option value={200}>Last 200</option>
            </select>
            <button
              onClick={loadLogs}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-800 px-4 py-2.5 text-sm font-black hover:bg-slate-100"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle size={18} />
          {error}
          <button onClick={() => setError("")} className="ml-auto"><X size={16} /></button>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Events", value: logs.length },
          { label: "SOS Events", value: logs.filter((l) => String(l.entity_type || "").toLowerCase().includes("sos")).length },
          { label: "Disaster Events", value: logs.filter((l) => String(l.entity_type || "").toLowerCase().includes("disaster")).length },
          { label: "Unique Users", value: new Set(logs.map((l) => l.user_id).filter(Boolean)).size },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">{s.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* LOG TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100"><ClipboardList size={18} className="text-slate-600" /></div>
            <div>
              <h2 className="font-black text-slate-800">Activity Feed</h2>
              <p className="text-xs text-slate-500 mt-0.5">{logs.length} events loaded</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={28} className="animate-spin text-slate-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList size={40} className="mx-auto text-slate-300" />
            <p className="mt-3 font-bold text-slate-600">No audit logs yet</p>
            <p className="mt-1 text-sm text-slate-400">Actions will appear here as they happen.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  {getIcon(log.entity_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-800">{log.action}</p>
                    {log.entity_type && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                        {log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ""}
                      </span>
                    )}
                  </div>
                  {log.detail && <p className="mt-0.5 text-xs text-slate-500">{log.detail}</p>}
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                    {log.user_name && (
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        {log.user_name}
                        {log.user_role && ` · ${log.user_role}`}
                      </span>
                    )}
                    <span>{timeAgo(log.timestamp)}</span>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] text-slate-400 whitespace-nowrap">
                  #{log.id}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
