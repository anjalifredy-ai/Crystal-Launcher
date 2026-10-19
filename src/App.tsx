import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Package, Settings, Play, Minus, Square, X,
  Loader2, ChevronDown, Pencil, Boxes, FolderOpen, Search, Plus,
  Compass, MoreVertical, Gamepad2
} from 'lucide-react'
import VersionsPage from './pages/VersionsPage'

type Tab = 'home' | 'versions' | 'mods' | 'manager' | 'settings'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [edition, setEdition] = useState<'java' | 'bedrock'>('java')
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('Spunky Optimized')
  const [loader, setLoader] = useState<'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt' | 'optifine'>('fabric')
  const [account, setAccount] = useState<{ id: string; username: string } | null>(null)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [accountError, setAccountError] = useState('')
  const [launching, setLaunching] = useState(false)
  const [launchMsg, setLaunchMsg] = useState<string | null>(null)
  const [javaInfo, setJavaInfo] = useState<string | null>(null)

  const refreshAccount = useCallback(async () => {
    if (!window.crystal?.getActiveAccount) return
    const a = await window.crystal.getActiveAccount()
    setAccount(a ? { id: a.id, username: a.username } : null)
  }, [])

  useEffect(() => {
    refreshAccount()
    window.crystal?.findJava?.().then((j) => {
      if (j.success) setJavaInfo(`Java ${j.major}`)
      else setJavaInfo('Java not found')
    })
  }, [refreshAccount])

  const handleMinimize = () => window.crystal?.minimize()
  const handleMaximize = () => window.crystal?.maximize()
  const handleClose = () => window.crystal?.close()

  const handleAddAccount = async () => {
    setAccountError('')
    const res = await window.crystal.addOfflineAccount(newUsername)
    if (!res.success) {
      setAccountError(res.error || 'Failed')
      return
    }
    if (res.account) {
      await window.crystal.setActiveAccount(res.account.id)
      setAccount({ id: res.account.id, username: res.account.username })
    }
    setNewUsername('')
    setShowAccountModal(false)
  }

  const handleLaunch = async (versionId?: string) => {
    const vid = versionId || selectedVersion
    if (!vid) {
      setLaunchMsg('Select / install a version first')
      setActiveTab('versions')
      return
    }
    if (!account) {
      setShowAccountModal(true)
      setLaunchMsg('Create offline account first')
      return
    }
    setLaunching(true)
    setLaunchMsg(null)
    try {
      const res = await window.crystal.launchGame(vid)
      if (res.success) setLaunchMsg(`Started · PID ${res.pid}`)
      else setLaunchMsg(res.error || 'Launch failed')
    } catch (e: any) {
      setLaunchMsg(e.message || 'Launch failed')
    } finally {
      setLaunching(false)
    }
  }

  const loaderLabel = {
    vanilla: 'Vanilla',
    fabric: 'Fabric',
    forge: 'Forge',
    neoforge: 'NeoForge',
    quilt: 'Quilt',
    optifine: 'OptiFine',
  }[loader]

  const versionChip = `${selectedVersion || '1.21'} · ${loaderLabel}`

  return (
    <div className="h-screen w-screen bg-[#070a10] text-white flex flex-col overflow-hidden font-sans antialiased">
      {/* ===== TOP BAR (CS style) ===== */}
      <header
        className="h-[52px] shrink-0 bg-[#0c1018]/95 backdrop-blur border-b border-white/[0.06] flex items-center px-3 gap-2 select-none"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 pl-1 pr-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5b8def] to-[#7c5cbf] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-sm font-black">C</span>
          </div>
          <div className="leading-none">
            <p className="text-[11px] font-bold tracking-[0.04em]">CRYSTAL LAUNCHER</p>
            <p className="text-[8px] text-white/35 tracking-[0.12em] mt-0.5">PLAY BEYOND LIMITS</p>
          </div>
        </div>

        {/* Center nav pills */}
        <nav className="flex items-center gap-0.5 ml-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {([
            { id: 'home' as Tab, icon: Home },
            { id: 'versions' as Tab, icon: Gamepad2 },
            { id: 'mods' as Tab, icon: Compass },
            { id: 'manager' as Tab, icon: FolderOpen },
            { id: 'settings' as Tab, icon: Settings },
          ]).map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === id
                  ? 'bg-white/10 text-white ring-1 ring-white/10'
                  : 'text-white/35 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              <Icon size={15} strokeWidth={2} />
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-1.5 pr-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="hidden sm:flex bg-black/50 rounded-lg p-0.5 text-[10px] mr-1">
            <button
              onClick={() => setEdition('java')}
              className={`px-2 py-1 rounded-md font-medium ${
                edition === 'java' ? 'bg-white/10 text-white' : 'text-white/35'
              }`}
            >Java</button>
            <button
              onClick={() => setEdition('bedrock')}
              className={`px-2 py-1 rounded-md font-medium ${
                edition === 'bedrock' ? 'bg-emerald-500/20 text-emerald-300' : 'text-white/35'
              }`}
            >Bedrock</button>
          </div>

          <button
            onClick={() => setShowAccountModal(true)}
            className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-[10px] font-bold">
              {(account?.username || 'P')[0].toUpperCase()}
            </div>
            <span className="text-xs font-medium max-w-[72px] truncate">{account?.username || 'Player'}</span>
            <ChevronDown size={12} className="text-white/30" />
          </button>

          <button className="w-9 h-9 rounded-full flex items-center justify-center text-white/35 hover:bg-white/5">
            <Search size={14} />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-white/35 hover:bg-white/5">
            <MoreVertical size={14} />
          </button>

          <div className="w-px h-5 bg-white/10 mx-0.5" />

          <button onClick={handleMinimize} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40"><Minus size={13} /></button>
          <button onClick={handleMaximize} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40"><Square size={11} /></button>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/80 text-white/40"><X size={13} /></button>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'home' && edition === 'java' && (
          <div className="h-full flex flex-col px-4 pt-3 pb-4 gap-3 max-w-[1100px] mx-auto w-full">
            {/* HERO BANNER - wide like CS */}
            <div className="relative rounded-[18px] overflow-hidden border border-white/[0.06] h-[210px] shrink-0">
              {/* Fake scene background */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, #1a2744 0%, #0d1528 40%, #151a28 70%, #1c1630 100%)',
                }}
              />
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 75% 45%, rgba(80,140,255,0.25), transparent 45%), radial-gradient(circle at 15% 70%, rgba(120,80,200,0.2), transparent 40%)',
                }}
              />
              {/* soft character silhouettes suggestion */}
              <div className="absolute right-[8%] top-[18%] w-16 h-20 rounded-lg bg-gradient-to-b from-purple-400/30 to-purple-700/20 blur-[1px]" />
              <div className="absolute right-[18%] top-[28%] w-14 h-18 rounded-lg bg-gradient-to-b from-amber-300/25 to-amber-700/15" />
              <div className="absolute right-[28%] bottom-[20%] w-12 h-16 rounded-lg bg-gradient-to-b from-slate-300/20 to-slate-600/20" />

              <div className="relative z-10 h-full flex flex-col justify-between p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-[42px] font-black tracking-tight leading-none drop-shadow-lg">
                      MINECRAFT
                    </h1>
                    <p className="text-[11px] text-white/45 tracking-[0.22em] uppercase mt-2 font-medium">
                      Play without limits
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('versions')}
                    className="flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-full bg-black/45 border border-white/10 text-[11px] font-medium hover:bg-black/60 backdrop-blur-sm"
                  >
                    <Boxes size={12} className="text-white/50" />
                    {versionChip}
                    <ChevronDown size={12} className="text-white/40" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {['FAST', 'STABLE', 'CUSTOMIZABLE'].map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 h-6 rounded-full bg-black/35 border border-white/10 text-[9px] font-semibold tracking-wide text-white/65"
                    >
                      <span className="w-1 h-1 rounded-full bg-white/50" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* PROFILE + EDIT + PLAY row */}
            <div className="flex items-stretch gap-2.5 shrink-0">
              {/* Selected profile */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-3 h-[72px] flex-1 min-w-0 px-3.5 rounded-[16px] bg-[#121722] border border-white/[0.06] hover:border-white/12 transition text-left"
              >
                <div className="w-12 h-12 rounded-[12px] bg-gradient-to-br from-rose-500 via-red-500 to-orange-600 flex items-center justify-center text-base font-black shadow-md shrink-0 ring-1 ring-white/10">
                  {profileName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-semibold text-white/35 uppercase tracking-[0.14em]">Selected Profile</p>
                  <p className="text-[15px] font-bold truncate leading-tight mt-0.5">{profileName}</p>
                  <p className="text-[11px] text-white/40 truncate">{versionChip}</p>
                </div>
                <ChevronDown size={16} className="text-white/25 shrink-0" />
              </button>

              {/* EDIT */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="h-[72px] px-5 rounded-[16px] bg-[#121722] border border-white/[0.06] hover:border-white/12 transition flex items-center gap-2 text-[13px] font-semibold tracking-wide"
              >
                <Pencil size={15} className="text-white/50" />
                EDIT
              </button>

              {/* PLAY - light pill like CS */}
              <button
                onClick={() => handleLaunch()}
                disabled={launching}
                className="h-[72px] flex-[1.15] min-w-[240px] rounded-[16px] bg-gradient-to-r from-[#b8e4ff] via-[#c8f0ff] to-[#a8e8f0] text-[#0a1520] font-black text-[20px] tracking-wide flex items-center justify-center gap-3 shadow-[0_8px_32px_rgba(120,200,255,0.25)] hover:brightness-105 active:scale-[0.99] transition disabled:opacity-60"
              >
                {launching ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <Play size={24} fill="currentColor" />
                )}
                <span>PLAY</span>
                <span className="text-[11px] font-bold opacity-55 tracking-normal">
                  {versionChip}
                </span>
                <ChevronDown size={16} className="opacity-40" />
              </button>
            </div>

            {launchMsg && (
              <p className={`text-[11px] px-1 -mt-1 ${launchMsg.includes('Started') ? 'text-emerald-400' : 'text-amber-400'}`}>
                {launchMsg}
              </p>
            )}

            {/* Bottom two cards */}
            <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
              <button
                onClick={() => setActiveTab('mods')}
                className="relative overflow-hidden rounded-[16px] border border-white/[0.06] bg-[#10151f] p-5 text-left hover:border-white/12 transition group min-h-[100px]"
              >
                <div
                  className="absolute inset-0 opacity-30 group-hover:opacity-40 transition"
                  style={{
                    background:
                      'linear-gradient(120deg, rgba(90,60,160,0.35) 0%, transparent 55%), radial-gradient(circle at 90% 80%, rgba(40,80,160,0.3), transparent 50%)',
                  }}
                />
                <div className="relative flex items-center justify-between h-full">
                  <div>
                    <p className="text-[13px] font-bold tracking-[0.06em]">BROWSER RESOURCES</p>
                    <p className="text-[11px] text-white/40 mt-1.5">Mods · Resource Packs · Shader Packs</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition">
                    <ChevronDown size={15} className="-rotate-90 text-white/45" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('manager')}
                className="relative overflow-hidden rounded-[16px] border border-white/[0.06] bg-[#10151f] p-5 text-left hover:border-white/12 transition group min-h-[100px]"
              >
                <div
                  className="absolute inset-0 opacity-30 group-hover:opacity-40 transition"
                  style={{
                    background:
                      'linear-gradient(120deg, rgba(30,100,140,0.35) 0%, transparent 55%), radial-gradient(circle at 85% 20%, rgba(80,50,120,0.25), transparent 45%)',
                  }}
                />
                <div className="relative flex items-center justify-between h-full">
                  <div>
                    <p className="text-[13px] font-bold tracking-[0.06em]">MANAGER</p>
                    <p className="text-[11px] text-white/40 mt-1.5">Manage Installed Mods, Packs and Worlds</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition">
                    <ChevronDown size={15} className="-rotate-90 text-white/45" />
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'home' && edition === 'bedrock' && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="max-w-md text-center space-y-3">
              <h2 className="text-2xl font-bold">Bedrock Edition</h2>
              <p className="text-white/40 text-sm">Win 10/11 Microsoft overlay support coming. Focus abhi Java layout + launch pe.</p>
            </div>
          </div>
        )}

        {activeTab === 'versions' && edition === 'java' && (
          <div className="h-full p-4 overflow-hidden max-w-[1100px] mx-auto w-full">
            <VersionsPage
              selectedVersion={selectedVersion}
              onSelectVersion={setSelectedVersion}
              onLaunch={handleLaunch}
              launching={launching}
            />
          </div>
        )}

        {activeTab === 'mods' && <ModsBrowser loader={loader} version={selectedVersion} />}

        {activeTab === 'manager' && (
          <div className="h-full p-6 max-w-[1100px] mx-auto w-full">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Package size={16} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-none">Manage Content</h2>
                <p className="text-[11px] text-white/40 mt-1">{profileName} · {versionChip}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4 mb-5">
              {['Mods', 'Resource Packs', 'Shaders'].map((t, i) => (
                <button
                  key={t}
                  className={`px-3 h-8 rounded-full text-xs font-medium border ${
                    i === 0 ? 'bg-white/10 border-white/15' : 'border-white/5 text-white/40'
                  }`}
                >
                  {t}
                </button>
              ))}
              <button className="ml-auto h-8 px-4 rounded-full bg-sky-300 text-[#0a1520] text-xs font-bold">+ Browse</button>
            </div>
            <div className="rounded-2xl border border-white/5 bg-[#10151f] p-8 text-center text-white/30 text-sm">
              Installed mods list yahan dikhega · Modrinth se install next step
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full p-6 overflow-auto max-w-[900px] mx-auto w-full">
            <h2 className="text-xl font-bold mb-1">Settings</h2>
            <p className="text-xs text-white/40 mb-6">Customize Crystal Launcher</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { title: 'Java Tweaks', desc: 'Java Runtimes, JVM Arguments, RAM amount' },
                { title: 'Miscellaneous settings', desc: 'Version list and libraries check' },
                { title: 'Video and renderer', desc: 'Resolution, renderer and performance' },
                { title: 'Experimental Stuff', desc: 'Use with consideration · no support' },
              ].map((s) => (
                <button key={s.title} className="text-left rounded-2xl border border-white/[0.06] bg-[#10151f] p-5 hover:border-white/12 transition flex items-center justify-between group">
                  <div>
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-[11px] text-white/40 mt-1">{s.desc}</p>
                  </div>
                  <ChevronDown size={16} className="-rotate-90 text-white/25 group-hover:text-white/50" />
                </button>
              ))}
            </div>
            {javaInfo && <p className="text-[10px] text-white/25 mt-4">{javaInfo} detected</p>}
          </div>
        )}
      </div>

      {/* Account modal */}
      <AnimatePresence>
        {showAccountModal && (
          <Modal onClose={() => setShowAccountModal(false)}>
            <h3 className="text-lg font-semibold mb-1">Offline Account</h3>
            <p className="text-xs text-white/40 mb-4">3–16 characters · letters, numbers, _</p>
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
              placeholder="Steve"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-400/50 mb-2"
              maxLength={16}
            />
            {accountError && <p className="text-xs text-red-400 mb-2">{accountError}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowAccountModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm">Cancel</button>
              <button onClick={handleAddAccount} className="flex-1 py-2.5 rounded-xl bg-sky-300 text-[#0a1520] text-sm font-bold">Add & Use</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Profile modal */}
      <AnimatePresence>
        {showProfileModal && (
          <Modal onClose={() => setShowProfileModal(false)} wide>
            <h3 className="text-lg font-semibold mb-1">Edit Profile</h3>
            <p className="text-xs text-white/40 mb-5">Configure instance · loader · version</p>

            <label className="text-[10px] text-white/40 uppercase tracking-wider">Profile Name</label>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full mt-1 mb-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-400/50"
            />

            <label className="text-[10px] text-white/40 uppercase tracking-wider">Loader</label>
            <div className="flex flex-wrap gap-2 mt-2 mb-4">
              {(['vanilla', 'fabric', 'forge', 'neoforge', 'quilt', 'optifine'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLoader(l)}
                  className={`px-3 py-1.5 rounded-xl text-xs capitalize border transition ${
                    loader === l
                      ? 'bg-sky-400/15 border-sky-400/40 text-sky-300'
                      : 'bg-white/5 border-white/10 text-white/45 hover:text-white'
                  }`}
                >
                  {l === 'optifine' ? 'OptiFine' : l === 'neoforge' ? 'NeoForge' : l}
                </button>
              ))}
            </div>

            <p className="text-xs text-white/40 mb-5">
              Version:{' '}
              <button className="text-sky-300 underline" onClick={() => { setShowProfileModal(false); setActiveTab('versions') }}>
                {selectedVersion || 'Pick from Versions'}
              </button>
              {loader !== 'vanilla' && (
                <span className="block mt-1 text-amber-400/70 text-[11px]">{loaderLabel} install pipeline next · Vanilla launch ready</span>
              )}
            </p>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowProfileModal(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-sm">Cancel</button>
              <button onClick={() => setShowProfileModal(false)} className="px-4 py-2.5 rounded-xl bg-sky-300 text-[#0a1520] text-sm font-bold flex items-center gap-1">
                <Plus size={14} /> Save
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`bg-[#121722] border border-white/10 rounded-2xl p-6 shadow-2xl ${wide ? 'w-full max-w-lg' : 'w-full max-w-sm'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  )
}

function ModsBrowser({ loader, version }: { loader: string; version: string | null }) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'mods' | 'resourcepacks' | 'shaders'>('mods')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const search = async () => {
    setLoading(true)
    try {
      const facets =
        tab === 'mods'
          ? '[["project_type:mod"]]'
          : tab === 'resourcepacks'
          ? '[["project_type:resourcepack"]]'
          : '[["project_type:shader"]]'
      const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(q || 'sodium')}&limit=12&facets=${encodeURIComponent(facets)}`
      const res = await fetch(url)
      const data = await res.json()
      setResults(data.hits || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    search()
  }, [tab])

  return (
    <div className="h-full p-6 overflow-auto max-w-[1100px] mx-auto w-full">
      <h2 className="text-[28px] font-black tracking-tight mb-0.5">MOD LIBRARY</h2>
      <p className="text-xs text-white/40 mb-5">Discover and manage · {loader} · {version || 'any'}</p>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
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

      <div className="flex gap-2 mb-5">
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
        <button onClick={search} className="h-10 px-5 rounded-full bg-sky-300 text-[#0a1520] text-sm font-bold">Search</button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 className="animate-spin" size={16} /> Loading...</div>
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
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-emerald-400/80 font-medium">Compatible</span>
                <a href={`https://modrinth.com/${tab === 'mods' ? 'mod' : tab === 'shaders' ? 'shader' : 'resourcepack'}/${m.slug}`} target="_blank" rel="noreferrer" className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10">Open</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
