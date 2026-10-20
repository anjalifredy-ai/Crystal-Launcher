/** Call from UI to install loader + save profile */
export async function installAndSaveProfile(opts: {
  loader: string
  mcVersion: string
  profileName: string
  onProgress?: (stage: string, percent: number) => void
}): Promise<{ success: boolean; versionId?: string; error?: string }> {
  const api = window.crystal
  if (!api?.installLoader) {
    return { success: false, error: 'Electron API missing — run npm run dev:electron' }
  }

  const unsub = api.onLoaderProgress?.((d: any) => {
    opts.onProgress?.(d.stage, d.percent)
  })

  try {
    const res = await api.installLoader(opts.loader, opts.mcVersion, null)
    if (!res.success || !res.versionId) {
      return { success: false, error: res.error || 'Install failed' }
    }

    if (api.upsertProfile) {
      const up = await api.upsertProfile({
        name: opts.profileName,
        loader: opts.loader,
        mcVersion: opts.mcVersion,
        launchVersionId: res.versionId,
      })
      if (up.profile?.id && api.setActiveProfile) {
        await api.setActiveProfile(up.profile.id)
      }
      if (up.profile?.id && api.setProfileLaunchVersion) {
        await api.setProfileLaunchVersion(up.profile.id, res.versionId)
      }
    }

    return { success: true, versionId: res.versionId }
  } catch (e: any) {
    return { success: false, error: e.message || 'Install failed' }
  } finally {
    unsub?.()
  }
}
