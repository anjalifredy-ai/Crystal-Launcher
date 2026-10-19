import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Package, Settings, User, Server, Play, Minus, Square, X,
  Loader2, ChevronDown, Pencil, Boxes, FolderOpen, Search, Plus
} from 'lucide-react'
import VersionsPage from './pages/VersionsPage'

type Tab = 'home' | 'versions' | 'mods' | 'manager' | 'settings' | 'skins' | 'servers'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [edition, setEdition] = useState<'java' | 'bedrock'>('java')
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('Crystal Profile')
  const [loader, setLoader] = useState<'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt' | 'optifine'>('vanilla')
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

  return (
    <div className="h-screen w-screen bg-[#0b0e14] text-white flex flex-col overflow-hidden font-sans">
      {/* Top bar - CS style */}
      <div
        className="h-12 bg-[#0d1118] border-b border-white/5 flex items-center justify-between px-4 select-none"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-xs font-black">C</div>
            <div>
              <p className="text-xs font-bold tracking-wide leading-none">CRYSTAL LAUNCHER</p>
              <p className="text-[9px] text-white/35 leading-none mt-0.5">PLAY BEYOND LIMITS</p>
            </div>
          </div>
          <div className="h-5 w-px bg-white/10 mx-1" />
          <nav className="flex items-center gap-1">
            {([
              { id: 'home' as Tab, icon: Home },
              { id: 'versions' as Tab, icon: Boxes },
              { id: 'mods' as Tab, icon: Package },
              { id: 'manager' as Tab, icon: FolderOpen },
              { id: 'settings' as Tab, icon: Settings },
            ]).map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                  activeTab === id ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {/* Edition */}
          <div className="flex bg-black/40 rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => setEdition('java')}
              className={`px-2.5 py-1 rounded-md ${
                edition === 'java' ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/40'
              }`}
            >Java</button>
            <button
              onClick={() => setEdition('bedrock')}
              className={`px-2.5 py-1 rounded-md ${
                edition === 'bedrock' ? 'bg-emerald-500/20 text-emerald-300' : 'text-white/40'
              }`}
            >Bedrock</button>
          </div>

          <button
            onClick={() => setShowAccountModal(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs"
          >
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-[10px] font-bold">
              {(account?.username || '?')[0].toUpperCase()}
            </div>
            <span className="max-w-[80px] truncate">{account?.username || 'Account'}</span>
            <ChevronDown size={12} className="text-white/40" />
          </button>

          <button onClick={handleMinimize} className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg"><Minus size={14} className="text-white/50" /></button>
          <button onClick={handleMaximize} className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg"><Square size={12} className="text-white/50" /></button>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center hover:bg-red-500/80 rounded-lg"><X size={14} className="text-white/50" /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'home' && edition === 'java' && (
          <div className="h-full flex flex-col p-5 gap-4 overflow-auto">
            {/* Hero banner */}
            <div className="relative rounded-2xl overflow-hidden border border-white/5 min-h-[200px] bg-gradient-to-br from-[#12182a] via-[#0f1524] to-[#0a0e18]">
              <div className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage: 'radial-gradient(ellipse at 70% 40%, rgba(56,189,248,0.15), transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(139,92,246,0.12), transparent 40%)',
                }}
              />
              <div className="relative z-10 p-6 flex flex-col justify-between h-full min-h-[200px]">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-4xl font-black tracking-tight">MINECRAFT</h1>
                    <p className="text-white/40 text-sm mt-1 tracking-widest uppercase">Play without limits</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('versions')}
                      className="px-3 py-1.5 rounded-full bg-black/40 border border-white/10 text-xs flex items-center gap-1.5 hover:bg-black/60"
                    >
                      <Boxes size={12} />
                      {selectedVersion || 'Select version'} · {loaderLabel}
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/60">FAST</span>
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/60">STABLE</span>
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/60">CUSTOMIZABLE</span>
                </div>
              </div>
            </div>

            {/* Profile + Play row */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex-1 min-w-[220px] flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#12171f] border border-white/5 hover:border-white/10 transition"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center text-sm font-bold shadow-lg">
                  {profileName[0]}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider">Selected Profile</p>
                  <p className="font-semibold truncate">{profileName}</p>
                  <p className="text-xs text-white/40">{selectedVersion || 'No version'} · {loaderLabel}</p>
                </div>
                <ChevronDown size={16} className="text-white/30" />
              </button>

              <button
                onClick={() => setShowProfileModal(true)}
                className="px-4 py-3 rounded-2xl bg-[#12171f] border border-white/5 hover:border-white/10 text-sm flex items-center gap-2"
              >
                <Pencil size={14} />
                EDIT
              </button>

              <button
                onClick={() => handleLaunch()}
                disabled={launching}
                className="flex-[1.2] min-w-[200px] py-4 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-300 text-[#0a0e14] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-cyan-500/20 hover:brightness-110 transition disabled:opacity-60"
              >
                {launching ? <Loader2 className="animate-spin" size={22} /> : <Play size={22} fill="currentColor" />}
                PLAY
                <span className="text-xs font-semibold opacity-70">
                  {selectedVersion || '...'} · {loaderLabel}
                </span>
                <ChevronDown size={16} className="opacity-50" />
              </button>
            </div>

            {launchMsg && (
              <p className={`text-xs px-1 ${launchMsg.includes('Started') ? 'text-emerald-400' : 'text-amber-400'}`}>
                {launchMsg}
              </p>
            )}

            {/* Bottom cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('mods')}
                className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#12171f] p-5 text-left hover:border-cyan-500/30 transition group"
              >
                <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition bg-gradient-to-r from-violet-600/20 to-transparent" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm tracking-wide">BROWSER RESOURCES</p>
                    <p className="text-xs text-white/40 mt-1">Mods · Resource Packs · Shader Packs</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 transition">
                    <ChevronDown size={16} className="-rotate-90 text-white/50" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('manager')}
                className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#12171f] p-5 text-left hover:border-violet-500/30 transition group"
              >
                <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition bg-gradient-to-r from-cyan-600/20 to-transparent" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm tracking-wide">MANAGER</p>
                    <p className="text-xs text-white/40 mt-1">Manage Installed Mods, Packs and Worlds</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-violet-500/20 transition">
                    <ChevronDown size={16} className="-rotate-90 text-white/50" />
                  </div>
                </div>
              </button>
            </div>

            <div className="text-[10px] text-white/25 flex gap-4 px-1">
              <span>{javaInfo || 'Detecting Java...'}</span>
              <span>Offline mode</span>
              <span>Crystal Launcher 0.1</span>
            </div>
          </div>
        )}

        {activeTab === 'home' && edition === 'bedrock' && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="max-w-md text-center space-y-3">
              <h2 className="text-2xl font-bold">Bedrock Edition</h2>
              <p className="text-white/40 text-sm">
                Windows 10/11 pe Microsoft Store / Xbox Bedrock launch support phase 3 mein aayega.
                Win7 pe limited / experimental.
              </p>
              <p className="text-xs text-white/25">Java pe focus abhi stable launch + mods pe hai.</p>
            </div>
          </div>
        )}

        {activeTab === 'versions' && edition === 'java' && (
          <div className="h-full p-5 overflow-hidden">
            <VersionsPage
              selectedVersion={selectedVersion}
              onSelectVersion={setSelectedVersion}
              onLaunch={handleLaunch}
              launching={launching}
            />
          </div>
        )}

        {activeTab === 'mods' && (
          <ModsBrowser loader={loader} version={selectedVersion} />
        )}

        {activeTab === 'manager' && (
          <div className="h-full p-6">
            <h2 className="text-xl font-bold mb-1">Manage Content</h2>
            <p className="text-xs text-white/40 mb-6">{profileName} · {selectedVersion || 'No version'}</p>
            <div className="grid grid-cols-3 gap-3">
              {['Mods', 'Resource Packs', 'Shaders'].map((t) => (
                <div key={t} className="rounded-2xl border border-white/5 bg-[#12171f] p-5">
                  <p className="font-semibold">{t}</p>
                  <p className="text-xs text-white/35 mt-1">Folder open + toggle coming next</p>
                  <button className="mt-4 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10">Open folder</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full p-6 overflow-auto">
            <h2 className="text-xl font-bold mb-1">Settings</h2>
            <p className="text-xs text-white/40 mb-6">Customize Crystal Launcher</p>
            <div className="grid grid-cols-2 gap-3 max-w-3xl">
              {[
                { title: 'Java Tweaks', desc: 'Java Runtimes, JVM Arguments, RAM' },
                { title: 'Miscellaneous', desc: 'Version list and libraries check' },
                { title: 'Video and renderer', desc: 'Resolution, renderer and performance' },
                { title: 'Experimental', desc: 'Use with caution — no support' },
              ].map((s) => (
                <button key={s.title} className="text-left rounded-2xl border border-white/5 bg-[#12171f] p-5 hover:border-white/15 transition">
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-xs text-white/40 mt-1">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Account modal */}
      <AnimatePresence>
        {showAccountModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowAccountModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#12171f] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-1">Offline Account</h3>
              <p className="text-xs text-white/40 mb-4">3–16 characters · letters, numbers, _</p>
              <input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                placeholder="Steve"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500/50 mb-2"
                maxLength={16}
              />
              {accountError && <p className="text-xs text-red-400 mb-2">{accountError}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowAccountModal(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-sm">Cancel</button>
                <button onClick={handleAddAccount} className="flex-1 py-2 rounded-xl bg-sky-400 text-[#0a0e14] text-sm font-semibold">Add & Use</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile / Create instance modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowProfileModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#12171f] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-1">Create / Edit Profile</h3>
              <p className="text-xs text-white/40 mb-5">Normal profile · loader + version</p>

              <label className="text-[11px] text-white/40 uppercase tracking-wider">Name</label>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full mt-1 mb-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500/50"
              />

              <label className="text-[11px] text-white/40 uppercase tracking-wider">Loader</label>
              <div className="flex flex-wrap gap-2 mt-2 mb-4">
                {(['vanilla', 'fabric', 'forge', 'neoforge', 'quilt', 'optifine'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLoader(l)}
                    className={`px-3 py-1.5 rounded-xl text-xs capitalize border transition ${
                      loader === l
                        ? 'bg-sky-400/20 border-sky-400/40 text-sky-300'
                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                    }`}
                  >
                    {l === 'optifine' ? 'OptiFine' : l === 'neoforge' ? 'NeoForge' : l}
                  </button>
                ))}
              </div>

              <p className="text-xs text-white/35 mb-4">
                Version: <button className="text-cyan-300 underline" onClick={() => { setShowProfileModal(false); setActiveTab('versions') }}>{selectedVersion || 'Pick from Versions tab'}</button>
                {loader !== 'vanilla' && (
                  <span className="block mt-1 text-amber-400/80">
                    {loaderLabel} install pipeline next — abhi Vanilla launch stable hai.
                  </span>
                )}
              </p>

              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowProfileModal(false)} className="px-4 py-2 rounded-xl bg-white/5 text-sm">Cancel</button>
                <button onClick={() => setShowProfileModal(false)} className="px-4 py-2 rounded-xl bg-sky-400 text-[#0a0e14] text-sm font-semibold flex items-center gap-1">
                  <Plus size={14} /> Save Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Simple Modrinth-style browser shell */
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
    <div className="h-full p-6 overflow-auto">
      <h2 className="text-2xl font-black tracking-tight mb-1">MOD LIBRARY</h2>
      <p className="text-xs text-white/40 mb-4">
        Discover via Modrinth · {loader} · {version || 'any version'}
      </p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['mods', 'resourcepacks', 'shaders'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-xl text-xs capitalize border ${
              tab === t ? 'bg-white/10 border-white/20' : 'border-white/5 text-white/40'
            }`}
          >
            {t === 'resourcepacks' ? 'Resource Packs' : t}
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
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-cyan-500/40"
          />
        </div>
        <button onClick={search} className="px-4 py-2 rounded-xl bg-sky-400 text-[#0a0e14] text-sm font-semibold">
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 className="animate-spin" size={16} /> Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {results.map((m) => (
            <div key={m.project_id} className="rounded-2xl border border-white/5 bg-[#12171f] p-4 hover:border-white/15 transition">
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
                <span className="text-[10px] text-emerald-400/80">Modrinth</span>
                <a
                  href={`https://modrinth.com/mod/${m.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10"
                >
                  Open
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <p className="text-white/30 text-sm">No results. Try another search.</p>
      )}
    </div>
  )
}
