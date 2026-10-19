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
- [ ] Electron + React + Tailwind base
- [ ] Basic UI shell (Home, Versions, Mods, Settings)
- [ ] Java version management
- [ ] Account system (Offline first)
- [ ] Microsoft Auth flow
- [ ] Launch system
- [ ] Mods / Resource packs folder management
- [ ] Bedrock support
- [ ] Skin / Cape manager
- [ ] Server hosting integration

---

## Tech Stack (Planned)

- **Frontend**: React + Vite + Tailwind CSS + Framer Motion (premium animations)
- **Desktop**: Electron (or Tauri later for performance)
- **Language**: TypeScript
- **Java Management**: Custom or adopt from existing open-source solutions
- **Auth**: Microsoft OAuth (device code flow)

---

## Roadmap

### Phase 1 – Core Launcher (Current Focus)
1. Beautiful dark premium UI
2. Java version downloading & launching
3. Offline accounts
4. Profiles
5. Basic mods/resource packs folders

### Phase 2 – Accounts & Polish
- Microsoft account login
- Skin changer
- Better version filtering
- Auto Java download (including legacy for old MC + Win7)

### Phase 3 – Bedrock + Advanced
- Bedrock Edition support
- Behavior packs / Resource packs for Bedrock
- Aternos / Exaroton quick launch buttons + webview

### Phase 4 – Client Integration (Optional & Risky)
- Fabric/Quilt based Crystal Client with HUD features

---

## Legal & Disclaimer

- This project does **not** distribute Minecraft game files.
- Users must own a legitimate copy of Minecraft.
- Custom clients with certain features can violate Mojang's Terms of Service and may result in account bans. Use at your own risk.
- Not affiliated with Mojang or Microsoft.

---

## Contributing

This is an ambitious project. Contributions, ideas, and PRs are welcome once the base is stable.

---

**Made with ❤️ for the Minecraft community**
