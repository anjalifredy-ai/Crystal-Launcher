import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Download, Check, Loader2, RefreshCw, Play } from 'lucide-react'

interface VersionInfo {
  id: string
  type: string
  url: string
  releaseTime: string
  installed: boolean
}

type FilterType = 'all' | 'release' | 'snapshot' | 'old'

export default function VersionsPage() {
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [latest, setLatest] = useState<{ release: string; snapshot: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('release')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ stage: string; percent: number } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const loadVersions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!window.crystal?.fetchVersions) {
        setError('Electron API not available. Run with npm run dev:electron')
        setLoading(false)
        return
      }
      const res = await window.crystal.fetchVersions()
      if (!res.success) {
        setError(res.error || 'Failed to load versions')
      } else {
        setVersions(res.versions || [])
        setLatest(res.latest || null)
        if (res.latest?.release) setSelected(res.latest.release)
      }
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  useEffect(() => {
    if (!window.crystal?.onDownloadProgress) return
    const unsub = window.crystal.onDownloadProgress((data) => {
      if (data.versionId === downloading) {
        setProgress({ stage: data.stage, percent: data.percent })
      }
    })
    return unsub
  }, [downloading])

  const handleInstall = async (v: VersionInfo) => {
    if (downloading) return
    setDownloading(v.id)
    setProgress({ stage: 'Starting...', percent: 0 })
    try {
      const res = await window.crystal.downloadVersion(v.id, v.url)
      if (res.success) {
        setVersions((prev) =>
          prev.map((x) => (x.id === v.id ? { ...x, installed: true } : x))
        )
        setSelected(v.id)
      } else {
        setError(res.error || 'Download failed')
      }
    } catch (e: any) {
      setError(e.message || 'Download failed')
    } finally {
      setDownloading(null)
      setProgress(null)
    }
  }

  const filtered = versions.filter((v) => {
    if (search && !v.id.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'release') return v.type === 'release'
    if (filter === 'snapshot') return v.type === 'snapshot'
    if (filter === 'old') return v.type === 'old_beta' || v.type === 'old_alpha'
    return true
  })

  const typeColor = (type: string) => {
    if (type === 'release') return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    if (type === 'snapshot') return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  }

  return (
    <div className="h-full flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search versions..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-cyan-500/50 transition"
          />
        </div>

        <div className="flex bg-black/40 rounded-xl p-1 gap-1">
          {(['release', 'snapshot', 'old', 'all'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg capitalize transition ${
                filter === f
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {f === 'old' ? 'Legacy' : f}
            </button>
          ))}
        </div>

        <button
          onClick={loadVersions}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Latest badges */}
      {latest && (
        <div className="flex gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            Latest Release: <strong>{latest.release}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
            Latest Snapshot: <strong>{latest.snapshot}</strong>
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Download progress bar */}
      <AnimatePresence>
        {downloading && progress && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-[#12121a] border border-cyan-500/20 rounded-xl p-4"
          >
            <div className="flex justify-between text-sm mb-2">
              <span className="text-cyan-300">Installing {downloading}</span>
              <span className="text-white/50">{progress.percent}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-xs text-white/40 mt-2">{progress.stage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version list */}
      <div className="flex-1 overflow-auto rounded-2xl border border-white/5 bg-[#0f0f17]/div>
        {loading ? (
          <div className="h-64 flex items-center justify-center gap-3 text-white/40">
            <Loader2 className="animate-spin" size={20} />
            Loading versions from Mojang...
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.slice(0, 80).map((v) => (
              <div
                key={v.id}
                onClick={() => setSelected(v.id)}
                className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition hover:bg-white/[0.03] ${
                  selected === v.id ? 'bg-cyan-500/5 border-l-2 border-cyan-500' : 'border-l-2 border-transparent'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{v.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border ${typeColor(v.type)}`}>
                      {v.type}
                    </span>
                    {v.installed && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                        <Check size={10} /> Installed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/30 mt-0.5">
                    {new Date(v.releaseTime).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {v.installed ? (
                    <button
                      className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-1.5 hover:from-cyan-500/30 hover:to-purple-500/30 transition"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected(v.id)
                        // Launch will be wired next
                      }}
                    >
                      <Play size={12} fill="currentColor" />
                      Select
                    </button>
                  ) : (
                    <button
                      disabled={!!downloading}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleInstall(v)
                      }}
                      className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-40"
                    >
                      {downloading === v.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      Install
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="h-40 flex items-center justify-center text-white/30 text-sm">
                No versions found
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-white/25">
        Showing {Math.min(filtered.length, 80)} of {filtered.length} versions · Client jar + version JSON download
      </p>
    </div>
  )
}
