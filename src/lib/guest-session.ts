import { DEFAULT_PREFERENCES, type UserColorStyle, type UserProfile, type UserThemePreference } from '@/types/user';

const STORAGE_KEY = 'wordmates:guest-session';
export const GUEST_SESSION_EVENT = 'wordmates:guest-session-change';

interface GuestSessionData {
  uid: string;
  username: string;
  avatarSeed?: string;
  theme?: UserThemePreference;
  colorStyle?: UserColorStyle;
}

const safeLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Local storage unavailable', error);
    return null;
  }
};

const dispatchGuestSessionEvent = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(GUEST_SESSION_EVENT));
};

const readGuestSession = (): GuestSessionData | null => {
  const storage = safeLocalStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestSessionData;
  } catch (error) {
    console.warn('Failed to parse guest session payload', error);
    return null;
  }
};

const writeGuestSession = (payload: GuestSessionData | null) => {
  const storage = safeLocalStorage();
  if (!storage) return;
  if (payload) {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } else {
    storage.removeItem(STORAGE_KEY);
  }
  dispatchGuestSessionEvent();
};

export const storeGuestSessionProfile = (payload: {
  uid: string;
  username: string;
  avatarSeed?: string;
}) => {
  const trimmed = payload.username.trim();
  const existing = readGuestSession();
  const nextData: GuestSessionData = {
    uid: payload.uid,
    username: trimmed,
    avatarSeed: payload.avatarSeed ?? existing?.avatarSeed ?? trimmed,
    theme: existing && existing.uid === payload.uid ? existing.theme : undefined,
    colorStyle: existing && existing.uid === payload.uid ? existing.colorStyle : undefined,
  };
  writeGuestSession(nextData);
};

export const hydrateGuestProfileFromSession = (uid?: string): UserProfile | null => {
  const data = readGuestSession();
  if (!data || !data.uid || !data.username) return null;
  if (uid && data.uid !== uid) return null;

  const preferences = { ...DEFAULT_PREFERENCES };
  if (data.theme) {
    preferences.theme = data.theme;
  }
  if (data.colorStyle) {
    preferences.colorStyle = data.colorStyle;
  }

  return {
    uid: data.uid,
    username: data.username,
    usernameLower: data.username.toLowerCase(),
    authProvider: 'guest',
    avatarSeed: data.avatarSeed ?? data.username,
    preferences,
  };
};

export const updateGuestSessionTheme = (theme: UserThemePreference) => {
  const current = readGuestSession();
  if (!current) return;
  writeGuestSession({ ...current, theme });
};

export const getGuestSessionTheme = (): UserThemePreference | undefined => readGuestSession()?.theme;

export const updateGuestSessionColorStyle = (colorStyle: UserColorStyle) => {
  const current = readGuestSession();
  if (!current) return;
  writeGuestSession({ ...current, colorStyle });
};

export const getGuestSessionColorStyle = (): UserColorStyle | undefined => readGuestSession()?.colorStyle;

export const clearGuestSession = () => {
  writeGuestSession(null);
};
