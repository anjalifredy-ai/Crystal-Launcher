/**
 * Crystal Optimized — performance mods (Dawn/Lunar-style FPS pack)
 * Installs via Modrinth into the shared mods folder after Fabric/Quilt profile install.
 */
import { modrinthInstall } from './contentManager'

type ProgressFn = (stage: string, percent: number) => void

/** Well-known Modrinth project IDs / slugs for optimization */
const OPTIMIZED_MODS: { slug: string; name: string }[] = [
  { slug: 'sodium', name: 'Sodium' },
  { slug: 'lithium', name: 'Lithium' },
  { slug: 'ferrite-core', name: 'FerriteCore' },
  { slug: 'entityculling', name: 'Entity Culling' },
  { slug: 'immediatelyfast', name: 'ImmediatelyFast' },
  { slug: 'modernfix', name: 'ModernFix' },
  { slug: 'lazydfu', name: 'LazyDFU' },
  { slug: 'starlight', name: 'Starlight' }, // lighting; may skip on very new MC
  { slug: 'iris', name: 'Iris' }, // optional shaders backend
  { slug: 'fabric-api', name: 'Fabric API' },
]

/**
 * Resolve Modrinth project id from slug, then install best matching version.
 */
async function installBySlug(
  slug: string,
  gameVersion: string,
  loader: string,
  onProgress?: ProgressFn
): Promise<{ ok: boolean; name: string; error?: string }> {
  try {
    const res = await fetch(`https://api.modrinth.com/v2/project/${slug}`)
    if (!res.ok) return { ok: false, name: slug, error: `project ${res.status}` }
    const proj = await res.json()
    const id = proj.id as string
    const title = (proj.title as string) || slug

    const result = await modrinthInstall(id, gameVersion, loader, 'mods', (s, p) =>
      onProgress?.(`${title}: ${s}`, p)
    )
    if (!result.success) return { ok: false, name: title, error: result.error }
    return { ok: true, name: title }
  } catch (e: any) {
    return { ok: false, name: slug, error: e.message }
  }
}

export async function installCrystalOptimized(
  mcVersion: string,
  loader: 'fabric' | 'quilt' = 'fabric',
  onProgress?: ProgressFn
): Promise<{ success: boolean; installed: string[]; skipped: string[]; error?: string }> {
  if (loader !== 'fabric' && loader !== 'quilt') {
    return {
      success: false,
      installed: [],
      skipped: [],
      error: 'Crystal Optimized needs Fabric or Quilt (Sodium stack).',
    }
  }

  const installed: string[] = []
  const skipped: string[] = []
  const total = OPTIMIZED_MODS.length

  for (let i = 0; i < OPTIMIZED_MODS.length; i++) {
    const mod = OPTIMIZED_MODS[i]
    onProgress?.(`Optimized pack (${i + 1}/${total}): ${mod.name}`, Math.round((i / total) * 100))

    // Starlight often unneeded / conflicting on 1.20+ with Sodium lighting changes — try anyway, skip fail
    const r = await installBySlug(mod.slug, mcVersion, loader, onProgress)
    if (r.ok) installed.push(r.name)
    else skipped.push(`${r.name}${r.error ? ` (${r.error})` : ''}`)
  }

  onProgress?.('Optimized pack done', 100)
  return {
    success: installed.length > 0,
    installed,
    skipped,
    error:
      installed.length === 0
        ? 'No optimization mods installed — check MC version + Fabric.'
        : undefined,
  }
}
