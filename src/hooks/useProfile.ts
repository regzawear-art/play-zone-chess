import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppUser } from '@/lib/supabase';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  country_code: string;
  flag_emoji: string;
  rating: number;
  bonus_points: number;
  bonus_claimed: boolean;
  wins: number;
  draws: number;
  losses: number;
}

export const COUNTRY_FLAGS: Record<string, { name: string; flag: string }> = {
  US: { name: 'United States', flag: '\u{1F1FA}\u{1F1F8}' },
  IN: { name: 'India', flag: '\u{1F1EE}\u{1F1F3}' },
  GB: { name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  NO: { name: 'Norway', flag: '\u{1F1F3}\u{1F1F4}' },
  RU: { name: 'Russia', flag: '\u{1F1F7}\u{1F1FA}' },
  CN: { name: 'China', flag: '\u{1F1E8}\u{1F1F3}' },
  DE: { name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}' },
  SE: { name: 'Sweden', flag: '\u{1F1F8}\u{1F1ED}' },
  BR: { name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}' },
  JP: { name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}' },
  FR: { name: 'France', flag: '\u{1F1EB}\u{1F1F7}' },
  CA: { name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}' },
  AU: { name: 'Australia', flag: '\u{1F1E6}\u{1F1FA}' },
  ES: { name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}' },
  IT: { name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}' },
  NL: { name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}' },
};

export function useProfile(authUser: AppUser | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBonusPopup, setShowBonusPopup] = useState(false);

  const ensureProfile = useCallback(async (user: AppUser) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) {
      setProfile(existing as Profile);
      return existing as Profile;
    }

    const username = user.email?.split('@')[0] ?? `player_${user.id.slice(0, 6)}`;
    const { data: created, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username,
        display_name: username,
        bonus_points: 50,
        bonus_claimed: false,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Profile creation error:', error.message);
      return null;
    }

    if (created) {
      setProfile(created as Profile);
      setShowBonusPopup(true);
      return created as Profile;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!authUser) {
      setProfile(null);
      return;
    }
    setLoading(true);
    ensureProfile(authUser).finally(() => setLoading(false));
  }, [authUser, ensureProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!authUser) return;
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', authUser.id)
        .select()
        .maybeSingle();
      if (error) {
        console.error('Profile update error:', error.message);
        return;
      }
      if (data) setProfile(data as Profile);
    },
    [authUser],
  );

  const claimBonus = useCallback(async () => {
    if (!authUser || !profile || profile.bonus_claimed) return;
    const { error } = await supabase
      .from('profiles')
      .update({ bonus_claimed: true })
      .eq('id', authUser.id);
    if (error) {
      console.error('Bonus claim error:', error.message);
      return;
    }
    setProfile({ ...profile, bonus_claimed: true });
    setShowBonusPopup(false);
  }, [authUser, profile]);

  return {
    profile,
    loading,
    showBonusPopup,
    setShowBonusPopup,
    ensureProfile,
    updateProfile,
    claimBonus,
  };
}
