# Crystal Launcher

**Premium Minecraft Launcher for Windows (7 / 10 / 11)**  
Java Edition + Bedrock Edition support  
Polished modern UI inspired by high-end clients

---

## Vision

Crystal Launcher aims to be a beautiful, fast, and feature-rich launcher that supports:

- Minecraft Java Edition (all versions)
- Minecraft Bedrock Edition (Windows)
- Offline (Local) accounts + Microsoft accounts
- Built-in Java management (including older Java for Win7 & legacy versions)
- Mods, Resource Packs, Shader Packs, Behavior Packs management
- Profile system
- Skin & Cape browser
- Server hosting quick links (Aternos / Exaroton)
- Clean premium dark UI

### Future / Advanced Goals
- In-game client features (mod menu style HUD, damage indicators, custom crosshair, PVP optimizations) via Fabric/Quilt client integration
- Advanced Bedrock version management (experimental)
- Built-in server manager with webview

> **Note**: Full in-game client modifications (like Dawn Client / Feather Client style) are a separate large project and carry Mojang ToS risks. This launcher focuses first on being an excellent launcher.

---

## Current Status

- [x] Repository created
- [x] Electron + React + Tailwind base
- [x] Premium frameless UI shell (Home, Versions, Mods, Settings...)
- [x] Java version list (Mojang piston-meta API)
- [x] Version search + filters (Release / Snapshot / Legacy)
- [x] Version download (client.jar + version JSON) with progress
- [ ] Full library + assets download
- [ ] Launch system (classpath + natives + offline auth)
- [ ] Account system (Offline first)
- [ ] Microsoft Auth flow
- [ ] Mods / Resource packs folder management
- [ ] Bedrock support
- [ ] Skin / Cape manager
- [ ] Server hosting integration

---

## Run (Development)

```bash
git clone https://github.com/anjalifredy-ai/Crystal-Launcher.git
cd Crystal-Launcher
npm install
npm run dev:electron
```

---

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **Desktop**: Electron
- **Language**: TypeScript
- **Versions API**: https://piston-meta.mojang.com/mc/game/version_manifest_v2.json

---

## Roadmap

### Phase 1 – Core Launcher (In Progress)
1. Beautiful dark premium UI ✅
2. Java version list + download ✅ (client jar)
3. Full install (libraries + assets) + Launch
4. Offline accounts
5. Basic mods/resource packs folders

### Phase 2 – Accounts & Polish
- Microsoft account login
- Skin changer
- Auto Java download (including legacy for old MC + Win7)

### Phase 3 – Bedrock + Advanced
- Bedrock Edition support
- Aternos / Exaroton buttons + webview

### Phase 4 – Client Integration (Optional & Risky)
- Fabric/Quilt based Crystal Client with HUD features

---

## Legal & Disclaimer

- This project does **not** distribute Minecraft game files.
- Users must own a legitimate copy of Minecraft.
- Custom clients with certain features can violate Mojang's Terms of Service and may result in account bans. Use at your own risk.
- Not affiliated with Mojang or Microsoft.

---

**Made with ❤️ for the Minecraft community**
