import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Profile } from '../types/database'

type ProfileSettings = Pick<Profile, 'auto_play' | 'show_romanization'>

const DEFAULTS: ProfileSettings = {
  auto_play: false,
  show_romanization: true,
}

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data ?? null)
        setLoading(false)
      })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(
    async (changes: Partial<ProfileSettings>) => {
      if (!user || !supabase) return
      // Optimistic update
      setProfile(prev => (prev ? { ...prev, ...changes } : prev))
      await supabase.from('profiles').update(changes).eq('id', user.id)
    },
    [user?.id], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return {
    profile,
    loading,
    update,
    auto_play: profile?.auto_play ?? DEFAULTS.auto_play,
    show_romanization: profile?.show_romanization ?? DEFAULTS.show_romanization,
  }
}
