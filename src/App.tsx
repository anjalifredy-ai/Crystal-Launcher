import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Home, Gamepad2, Package, Settings, User, Server,
  Download, Play, Minus, Square, X, Loader2
} from 'lucide-react'
import VersionsPage from './pages/VersionsPage'

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'versions', label: 'Versions', icon: Gamepad2 },
  { id: 'mods', label: 'Mods & Packs', icon: Package },
  { id: 'skins', label: 'Skins & Capes', icon: User },
  { id: 'servers', label: 'Servers', icon: Server },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [edition, setEdition] = useState<'java' | 'bedrock'>('java')
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [account, setAccount] = useState<{ id: string; username: string } | null>(null)
  const [showAccountModal, setShowAccountModal] = useState(false)
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
      if (j.success) setJavaInfo(`Java ${j.major} (${j.version})`)
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
      setLaunchMsg('Select a version first')
      setActiveTab('versions')
      return
    }
    if (!account) {
      setShowAccountModal(true)
      setLaunchMsg('Create an offline account first')
      return
    }
    setLaunching(true)
    setLaunchMsg(null)
    try {
      const res = await window.crystal.launchGame(vid)
      if (res.success) {
        setLaunchMsg(`Game started (PID ${res.pid})`)
      } else {
        setLaunchMsg(res.error || 'Launch failed')
      }
    } catch (e: any) {
      setLaunchMsg(e.message || 'Launch failed')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="h-screen w-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden font-sans">
      {/* Title bar */}
      <div className="h-9 bg-[#0a0a0f] border-b border-white/5 flex items-center justify-between px-3 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500" />
          <span className="text-xs text-white/60 font-medium tracking-wide">CRYSTAL LAUNCHER</span>
        </div>
        <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button onClick={handleMinimize} className="w-11 h-9 flex items-center justify-center hover:bg-white/10 transition"><Minus size={14} className="text-white/60" /></button>
          <button onClick={handleMaximize} className="w-11 h-9 flex items-center justify-center hover:bg-white/10 transition"><Square size={12} className="text-white/60" /></button>
          <button onClick={handleClose} className="w-11 h-9 flex items-center justify-center hover:bg-red-500/80 transition"><X size={14} className="text-white/60" /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-[#0f0f17] border-r border-white/5 flex flex-col">
          <div className="p-5 border-b border-white/5">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">CRYSTAL</span>
              <span className="text-white/80 text-sm ml-1">Launcher</span>
            </h1>
            <p className="text-xs text-white/40 mt-1">Premium Minecraft Experience</p>
          </div>

          <div className="p-4">
            <div className="flex bg-black/40 rounded-xl p-1">
              <button onClick={() => setEdition('java')} className={`flex-1 py-2 text-sm rounded-lg transition-all ${
                edition === 'java' ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30' : 'text-white/50 hover:text-white/80'
              }`}>Java</button>
              <button onClick={() => setEdition('bedrock')} className={`flex-1 py-2 text-sm rounded-lg transition-all ${
                edition === 'bedrock' ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30' : 'text-white/50 hover:text-white/80'
              }`}>Bedrock</button>
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                    isActive ? 'bg-white/10 text-white shadow-lg shadow-cyan-500/5' : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  }`}>
                  <Icon size={18} className={isActive ? 'text-cyan-400' : ''} />
                  {tab.label}
                </button>
              )
            })}
          </nav>

          <div className="p-4 border-t border-white/5">
            <div
              onClick={() => setShowAccountModal(true)}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                {(account?.username || 'C')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{account?.username || 'No Account'}</p>
                <p className="text-xs text-white/40">{account ? 'Offline Account' : 'Click to add'}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col relative">
          <header className="h-14 border-b border-white/5 flex items-center justify-between px-8">
            <div>
              <h2 className="text-lg font-semibold capitalize">{activeTab.replace('-', ' ')}</h2>
              <p className="text-xs text-white/40">
                {edition === 'java' ? 'Minecraft Java Edition' : 'Minecraft Bedrock Edition'}
                {selectedVersion ? ` · ${selectedVersion}` : ''}
                {javaInfo ? ` · ${javaInfo}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {launchMsg && (
                <span className={`text-xs max-w-xs truncate ${launchMsg.includes('started') ? 'text-green-400' : 'text-amber-400'}`}>
                  {launchMsg}
                </span>
              )}
              <button
                onClick={() => handleLaunch()}
                disabled={launching}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition disabled:opacity-60"
              >
                {launching ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                Play
              </button>
            </div>
          </header>

          <div className="flex-1 p-6 overflow-hidden">
            {activeTab === 'home' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full overflow-auto">
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 bg-gradient-to-br from-[#12121a] to-[#0f0f17] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
                    <h3 className="text-2xl font-bold mb-2">Welcome to Crystal</h3>
                    <p className="text-white/50 mb-6 max-w-md">
                      Install any Java version, create offline account, and hit Play.
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => setActiveTab('versions')} className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm transition">
                        Browse Versions
                      </button>
                      <button onClick={() => setShowAccountModal(true)} className="px-5 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-sm hover:bg-cyan-500/30 transition">
                        {account ? 'Switch Account' : 'Add Account'}
                      </button>
                    </div>
                  </div>
                  <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 space-y-4">
                    <div>
                      <p className="text-sm text-white/50">Selected</p>
                      <p className="text-lg font-semibold">{selectedVersion || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-white/50">Account</p>
                      <p className="text-lg font-semibold">{account?.username || 'None'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-white/50">Java</p>
                      <p className="text-sm">{javaInfo || '...'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'versions' && edition === 'java' && (
              <VersionsPage
                selectedVersion={selectedVersion}
                onSelectVersion={setSelectedVersion}
                onLaunch={handleLaunch}
                launching={launching}
              />
            )}

            {activeTab === 'versions' && edition === 'bedrock' && (
              <div className="h-full flex items-center justify-center text-white/30">Bedrock support coming later</div>
            )}

            {activeTab !== 'home' && activeTab !== 'versions' && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white/30 text-lg mb-2">{tabs.find(t => t.id === activeTab)?.label}</p>
                  <p className="text-white/20 text-sm">Coming soon...</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Account modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAccountModal(false)}>
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">Offline Account</h3>
            <p className="text-xs text-white/40 mb-4">Username for offline / cracked mode (3–16 chars)</p>
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
              <button onClick={() => setShowAccountModal(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-sm hover:bg-white/10">Cancel</button>
              <button onClick={handleAddAccount} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-sm font-medium">Add & Use</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
