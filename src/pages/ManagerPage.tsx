import React, { useEffect, useState, useCallback } from 'react'
import { Package, FolderOpen, Trash2, RefreshCw, Loader2 } from 'lucide-react'

interface ContentFile {
  name: string
  path: string
  enabled: boolean
  size: number
}

interface Props {
  profileName: string
  versionLabel: string
}

export default function ManagerPage({ profileName, versionLabel }: Props) {
  const [tab, setTab] = useState<'mods' | 'resourcepacks' | 'shaderpacks'>('mods')
  const [files, setFiles] = useState<ContentFile[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!window.crystal?.listContent) return
    setLoading(true)
    try {
      const list = await window.crystal.listContent(tab)
      setFiles(list || [])
    } catch {
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const toggle = async (f: ContentFile) => {
    const next = await window.crystal.setContentEnabled(tab, f.name, !f.enabled)
    setFiles(next)
  }

  const remove = async (f: ContentFile) => {
    const next = await window.crystal.deleteContent(tab, f.name)
    setFiles(next)
  }

  return (
    <div className="h-full p-6 max-w-[1100px] mx-auto w-full overflow-auto">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <Package size={16} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold leading-none">Manage Content</h2>
          <p className="text-[11px] text-white/40 mt-1">{profileName} · {versionLabel}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4 mb-5 flex-wrap items-center">
        {(['mods', 'resourcepacks', 'shaderpacks'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 h-8 rounded-full text-xs font-medium border ${
              tab === t ? 'bg-white/10 border-white/15' : 'border-white/5 text-white/40'
            }`}
          >
            {t === 'resourcepacks' ? 'Resource Packs' : t === 'shaderpacks' ? 'Shaders' : 'Mods'}
          </button>
        ))}
        <button
          onClick={load}
          className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() => window.crystal.openContentFolder(tab)}
          className="h-8 px-3 rounded-full bg-white/5 text-xs flex items-center gap-1.5 hover:bg-white/10 ml-auto"
        >
          <FolderOpen size={13} /> Open folder
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 text-sm py-12 justify-center">
          <Loader2 className="animate-spin" size={16} /> Loading...
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#10151f] p-10 text-center text-white/30 text-sm">
          No files yet. Install from <strong className="text-white/50">Mod Library</strong> or drop jars into the folder.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {files.map((f) => (
            <div
              key={f.path}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#10151f] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-[10px] text-white/30">{(f.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                onClick={() => toggle(f)}
                className={`relative w-10 h-5 rounded-full transition ${
                  f.enabled ? 'bg-emerald-500/80' : 'bg-white/10'
                }`}
                title={f.enabled ? 'Enabled' : 'Disabled'}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${
                    f.enabled ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
              <button
                onClick={() => remove(f)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
