import React, { useEffect, useState } from 'react'
import { Search, Loader2, Download } from 'lucide-react'

interface Props {
  loader: string
  version: string | null
}

export default function ModsPage({ loader, version }: Props) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'mods' | 'resourcepacks' | 'shaders'>('mods')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const contentType = tab === 'shaders' ? 'shaderpacks' : tab

  const search = async () => {
    setLoading(true)
    setMsg(null)
    try {
      const facets =
        tab === 'mods'
          ? '[["project_type:mod"]]'
          : tab === 'resourcepacks'
          ? '[["project_type:resourcepack"]]'
          : '[["project_type:shader"]]'
      const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(q || 'sodium')}&limit=18&facets=${encodeURIComponent(facets)}`
      const res = await fetch(url)
      const data = await res.json()
      setResults(data.hits || [])
    } catch {
      setResults([])
      setMsg('Search failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    search()
  }, [tab])

  const install = async (projectId: string, title: string) => {
    if (!window.crystal?.modrinthInstall) {
      setMsg('Run with Electron: npm run dev:electron')
      return
    }
    setInstalling(projectId)
    setMsg(`Installing ${title}...`)
    try {
      const res = await window.crystal.modrinthInstall(projectId, version, loader, contentType)
      if (res.success) setMsg(`Installed: ${res.fileName}`)
      else setMsg(res.error || 'Install failed')
    } catch (e: any) {
      setMsg(e.message || 'Install failed')
    } finally {
      setInstalling(null)
    }
  }

  return (
    <div className="h-full p-6 overflow-auto max-w-[1100px] mx-auto w-full">
      <h2 className="text-[28px] font-black tracking-tight mb-0.5">MOD LIBRARY</h2>
      <p className="text-xs text-white/40 mb-5">
        Modrinth browse + install · {loader} · {version || 'any version'}
      </p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['mods', 'resourcepacks', 'shaders'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 h-8 rounded-full text-xs capitalize border font-medium ${
              tab === t ? 'bg-white/10 border-white/15 text-white' : 'border-white/5 text-white/40'
            }`}
          >
            {t === 'resourcepacks' ? 'Resource Packs' : t === 'shaders' ? 'Shaders' : 'Mods'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search mods..."
            className="w-full bg-white/5 border border-white/10 rounded-full pl-9 pr-3 h-10 text-sm outline-none focus:border-sky-400/40"
          />
        </div>
        <button onClick={search} className="h-10 px-5 rounded-full bg-sky-300 text-[#0a1520] text-sm font-bold">
          Search
        </button>
      </div>

      {msg && <p className="text-xs text-sky-300/90 mb-3">{msg}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Loader2 className="animate-spin" size={16} /> Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((m) => (
            <div key={m.project_id} className="rounded-2xl border border-white/[0.06] bg-[#10151f] p-4 hover:border-white/12 transition">
              <div className="flex gap-3">
                {m.icon_url ? (
                  <img src={m.icon_url} alt="" className="w-12 h-12 rounded-xl object-cover bg-black/40" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{m.title}</p>
                  <p className="text-[11px] text-white/35 line-clamp-2 mt-0.5">{m.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 gap-2">
                <span className="text-[10px] text-emerald-400/80 font-medium">Modrinth</span>
                <button
                  disabled={!!installing}
                  onClick={() => install(m.project_id, m.title)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-sky-300 text-[#0a1520] font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  {installing === m.project_id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  Install
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
