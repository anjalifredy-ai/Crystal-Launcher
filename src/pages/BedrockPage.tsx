import React, { useEffect, useState } from 'react'
import {
  Play,
  Loader2,
  Store,
  Gamepad2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'

interface BedrockStatus {
  supported: boolean
  windowsEdition: string
  installed: boolean
  previewInstalled: boolean
  packageFamilyName: string
  message: string
}

type BedrockProfile = 'release' | 'preview'

export default function BedrockPage() {
  const [status, setStatus] = useState<BedrockStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [profile, setProfile] = useState<BedrockProfile>('release')
  const [showPicker, setShowPicker] = useState(false)

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
    if (!status?.supported) return
    setLaunching(true)
    setMsg(null)
    try {
      const isPreview = profile === 'preview'
      const res = await window.crystal.launchBedrock(isPreview)
      if (res.success) {
        if (res.method === 'ms-store') {
          setMsg(res.error || 'Microsoft Store opened — install karke phir PLAY')
        } else {
          setMsg(
            `Started ${isPreview ? 'Preview' : 'Release'} · ${res.method} · Microsoft / Xbox login`
          )
        }
      } else {
        setMsg(res.error || 'Launch failed')
      }
    } catch (e: any) {
      setMsg(e.message || 'Launch failed')
    } finally {
      setLaunching(false)
      setTimeout(refresh, 1200)
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
  const selectedInstalled = profile === 'release' ? s.installed : s.previewInstalled
  const profileLabel = profile === 'release' ? 'RELEASE' : 'PREVIEW'
  const profileSub =
    profile === 'release'
      ? s.installed
        ? 'Bedrock · Installed'
        : 'Bedrock · Not installed'
      : s.previewInstalled
        ? 'Bedrock Preview · Installed'
        : 'Bedrock Preview · Not installed'

  return (
    <div className="h-full flex flex-col px-4 pt-3 pb-4 gap-3 max-w-[1100px] mx-auto w-full overflow-auto">
      {/* Hero — Dawn-style */}
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
              'radial-gradient(circle at 75% 40%, rgba(52,211,153,0.28), transparent 45%), radial-gradient(circle at 15% 75%, rgba(16,185,129,0.18), transparent 40%)',
          }}
        />
        <div className="relative z-10 h-full flex flex-col justify-between p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-emerald-300/70 uppercase">
                Like Dawn · Microsoft Store
              </p>
              <h1 className="text-[40px] font-black tracking-tight leading-none mt-1">BEDROCK</h1>
              <p className="text-[11px] text-white/45 mt-2 tracking-wide">
                Release + Preview · Xbox account overlay
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
            {['REALMS', 'CROSS-PLAY', 'MARKETPLACE'].map((t) => (
              <span
                key={t}
                className="px-2.5 h-6 rounded-full bg-black/35 border border-white/10 text-[9px] font-semibold text-white/60 flex items-center gap-1"
              >
                <span className="w-1 h-1 rounded-full bg-white/40" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Profile row — Dawn style: selected profile | PLAY */}
      <div className="flex items-stretch gap-2.5 relative">
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-3 h-[72px] flex-1 min-w-0 px-3.5 rounded-[16px] bg-[#121722] border border-white/[0.06] hover:border-white/12 transition text-left"
        >
          <div
            className={`w-12 h-12 rounded-[12px] flex items-center justify-center text-sm font-black shrink-0 ring-1 ring-white/10 ${
              profile === 'release'
                ? 'bg-gradient-to-br from-emerald-400 to-teal-700'
                : 'bg-gradient-to-br from-violet-400 to-indigo-700'
            }`}
          >
            {profile === 'release' ? 'R' : 'P'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold text-white/35 uppercase tracking-[0.14em]">
              Selected Profile
            </p>
            <p className="text-[15px] font-bold truncate leading-tight mt-0.5">{profileLabel}</p>
            <p className="text-[11px] text-white/40 truncate flex items-center gap-1.5">
              {selectedInstalled ? (
                <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle size={11} className="text-amber-400 shrink-0" />
              )}
              {profileSub}
            </p>
          </div>
          <ChevronDown size={16} className="text-white/25 shrink-0" />
        </button>

        <button
          onClick={handlePlay}
          disabled={launching || !s.supported}
          className="h-[72px] flex-[1.15] min-w-[220px] rounded-[16px] bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 text-[#0a1520] font-black text-[18px] tracking-wide flex items-center justify-center gap-3 shadow-[0_8px_32px_rgba(52,211,153,0.22)] hover:brightness-105 active:scale-[0.99] transition disabled:opacity-50"
        >
          {launching ? <Loader2 className="animate-spin" size={22} /> : <Play size={22} fill="currentColor" />}
          PLAY
          <span className="text-[11px] font-bold opacity-55">{profileLabel}</span>
        </button>

        {/* Profile picker dropdown */}
        {showPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
            <div className="absolute left-0 top-[80px] z-50 w-full max-w-md rounded-2xl border border-white/10 bg-[#121722] shadow-2xl overflow-hidden">
              <p className="px-4 pt-3 pb-2 text-[10px] font-semibold text-white/35 uppercase tracking-wider">
                Bedrock profiles
              </p>
              {(
                [
                  {
                    id: 'release' as const,
                    title: 'RELEASE',
                    desc: 'Minecraft for Windows · stable Store build',
                    ok: s.installed,
                  },
                  {
                    id: 'preview' as const,
                    title: 'PREVIEW',
                    desc: 'Minecraft Preview · beta features',
                    ok: s.previewInstalled,
                  },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setProfile(p.id)
                    setShowPicker(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition ${
                    profile === p.id ? 'bg-white/[0.06]' : ''
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${
                      p.id === 'release'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-violet-500/20 text-violet-300'
                    }`}
                  >
                    {p.title[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{p.title}</p>
                    <p className="text-[11px] text-white/40 truncate">{p.desc}</p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      p.ok
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-white/5 text-white/35'
                    }`}
                  >
                    {p.ok ? 'Installed' : 'Missing'}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {msg && (
        <p
          className={`text-[11px] px-1 ${
            msg.includes('Started') ? 'text-emerald-400' : 'text-amber-300'
          }`}
        >
          {msg}
        </p>
      )}

      {/* Quick actions */}
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
            <p className="text-[11px] text-white/40">Install Release / Preview</p>
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
            <p className="text-sm font-bold">Xbox</p>
            <p className="text-[11px] text-white/40">Account · Game Pass</p>
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
            <p className="text-sm font-bold">Refresh</p>
            <p className="text-[11px] text-white/40">Check install status</p>
          </div>
        </button>
      </div>

      {!s.supported && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
          <p className="font-semibold text-amber-300 mb-1">Windows 10 / 11 required</p>
          <p className="text-[12px] text-white/50">
            Dawn jaisa Bedrock yahan bhi Microsoft Store apps pe chalta hai. Win7 pe sirf Java Edition.
          </p>
        </div>
      )}

      <p className="text-[10px] text-white/25 px-1">
        Dawn-style: sirf RELEASE + PREVIEW · game Microsoft / Xbox login se alag window mein khulta hai
      </p>
    </div>
  )
}
