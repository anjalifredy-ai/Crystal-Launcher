import React, { useEffect, useState } from 'react'
import { Play, Loader2, Store, Gamepad2, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'

interface BedrockStatus {
  supported: boolean
  windowsEdition: string
  installed: boolean
  previewInstalled: boolean
  packageFamilyName: string
  message: string
}

export default function BedrockPage() {
  const [status, setStatus] = useState<BedrockStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      if (!window.crystal?.bedrockStatus) {
        setStatus({
          supported: false,
          windowsEdition: 'unknown',
          installed: false,
          previewInstalled: false,
          packageFamilyName: '',
          message: 'Run with Electron: npm run dev:electron',
        })
        return
      }
      const s = await window.crystal.bedrockStatus()
      setStatus(s)
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const handlePlay = async () => {
    setLaunching(true)
    setMsg(null)
    try {
      const res = await window.crystal.launchBedrock(preview)
      if (res.success) {
        setMsg(
          res.method === 'ms-store'
            ? res.error || 'Microsoft Store opened — install karke phir Play dabao'
            : `Launched via ${res.method} · Microsoft / Xbox account overlay`
        )
      } else {
        setMsg(res.error || 'Launch failed')
      }
    } catch (e: any) {
      setMsg(e.message || 'Launch failed')
    } finally {
      setLaunching(false)
      setTimeout(refresh, 1500)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-white/40 gap-2">
        <Loader2 className="animate-spin" size={18} /> Checking Bedrock…
      </div>
    )
  }

  const s = status!

  return (
    <div className="h-full flex flex-col px-4 pt-3 pb-4 gap-3 max-w-[1100px] mx-auto w-full overflow-auto">
      {/* Banner */}
      <div className="relative rounded-[18px] overflow-hidden border border-white/[0.06] h-[200px] shrink-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, #0d3d2e 0%, #0a1f18 40%, #0f1520 70%, #122a22 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'radial-gradient(circle at 70% 40%, rgba(52,211,153,0.25), transparent 45%), radial-gradient(circle at 20% 80%, rgba(16,185,129,0.15), transparent 40%)',
          }}
        />
        <div className="relative z-10 h-full flex flex-col justify-between p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-emerald-300/70 uppercase">
                Microsoft Store · Xbox
              </p>
              <h1 className="text-[36px] font-black tracking-tight leading-none mt-1">BEDROCK</h1>
              <p className="text-[11px] text-white/45 mt-2 tracking-wide">
                Play with Microsoft account overlay
              </p>
            </div>
            <span
              className={`px-2.5 h-7 rounded-full text-[10px] font-bold flex items-center border ${
                s.supported
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              }`}
            >
              {s.windowsEdition.toUpperCase()}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="px-2.5 h-6 rounded-full bg-black/35 border border-white/10 text-[9px] font-semibold text-white/60 flex items-center">
              REALMS
            </span>
            <span className="px-2.5 h-6 rounded-full bg-black/35 border border-white/10 text-[9px] font-semibold text-white/60 flex items-center">
              CROSS-PLAY
            </span>
            <span className="px-2.5 h-6 rounded-full bg-black/35 border border-white/10 text-[9px] font-semibold text-white/60 flex items-center">
              MARKETPLACE
            </span>
          </div>
        </div>
      </div>

      {/* Status + Play */}
      <div className="flex items-stretch gap-2.5 flex-wrap">
        <div className="flex-1 min-w-[240px] rounded-[16px] bg-[#121722] border border-white/[0.06] px-4 py-3 flex items-center gap-3">
          {s.installed ? (
            <CheckCircle2 className="text-emerald-400 shrink-0" size={22} />
          ) : (
            <AlertTriangle className="text-amber-400 shrink-0" size={22} />
          )}
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-white/35 uppercase tracking-wider">Status</p>
            <p className="text-sm font-semibold truncate">
              {s.installed ? 'Installed' : 'Not installed'}
              {s.previewInstalled ? ' · Preview OK' : ''}
            </p>
            <p className="text-[11px] text-white/40 line-clamp-2">{s.message}</p>
          </div>
        </div>

        <label className="h-[72px] px-4 rounded-[16px] bg-[#121722] border border-white/[0.06] flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={preview}
            onChange={(e) => setPreview(e.target.checked)}
            className="rounded"
          />
          Preview
        </label>

        <button
          onClick={handlePlay}
          disabled={launching || !s.supported}
          className="h-[72px] flex-[1.15] min-w-[220px] rounded-[16px] bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 text-[#0a1520] font-black text-[18px] flex items-center justify-center gap-3 shadow-[0_8px_32px_rgba(52,211,153,0.2)] hover:brightness-105 disabled:opacity-50"
        >
          {launching ? <Loader2 className="animate-spin" size={22} /> : <Play size={22} fill="currentColor" />}
          PLAY BEDROCK
        </button>
      </div>

      {msg && (
        <p className={`text-[11px] px-1 ${msg.includes('Launched') ? 'text-emerald-400' : 'text-amber-300'}`}>
          {msg}
        </p>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          onClick={() => window.crystal.openBedrockStore()}
          className="rounded-[16px] border border-white/[0.06] bg-[#10151f] p-4 text-left hover:border-emerald-500/30 transition flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Store size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold">Microsoft Store</p>
            <p className="text-[11px] text-white/40">Install / update Bedrock</p>
          </div>
          <ExternalLink size={14} className="ml-auto text-white/25" />
        </button>

        <button
          onClick={() => window.crystal.openXbox()}
          className="rounded-[16px] border border-white/[0.06] bg-[#10151f] p-4 text-left hover:border-green-500/30 transition flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
            <Gamepad2 size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-sm font-bold">Xbox App</p>
            <p className="text-[11px] text-white/40">Microsoft account · Game Pass</p>
          </div>
          <ExternalLink size={14} className="ml-auto text-white/25" />
        </button>

        <button
          onClick={refresh}
          className="rounded-[16px] border border-white/[0.06] bg-[#10151f] p-4 text-left hover:border-white/15 transition flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Loader2 size={18} className="text-white/50" />
          </div>
          <div>
            <p className="text-sm font-bold">Refresh status</p>
            <p className="text-[11px] text-white/40">Re-check package install</p>
          </div>
        </button>
      </div>

      {!s.supported && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/80">
          <p className="font-semibold text-amber-300 mb-1">Windows 10 / 11 required</p>
          <p className="text-[12px] text-white/50">
            Bedrock Microsoft Store overlay Win7 pe possible nahi. Java Edition use karo.
            Multi-version Bedrock (side-by-side) advanced tools jaise MC-W10-Version-Launcher se hota
            hai — Crystal abhi official Store app launch karta hai.
          </p>
        </div>
      )}

      <p className="text-[10px] text-white/25 px-1">
        Launch uses minecraft:// protocol + shell:AppsFolder · login Xbox / Microsoft Store account se
      </p>
    </div>
  )
}
