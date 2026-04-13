'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import { useFirebase } from '@/components/firebase-provider';
import {
    isGuestProfile,
    type UserColorStyle,
} from '@/types/user';
import { updateGuestSessionColorStyle } from '@/lib/guest-session';

interface ColorStyleContextType {
    colorStyle: UserColorStyle;
    setColorStyle: (style: UserColorStyle) => void;
}

const ColorStyleContext = createContext<ColorStyleContextType | undefined>(undefined);

const CLASS_PREFIX = 'color-';

function applyColorStyleClass(style: UserColorStyle) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Remove any existing color-style classes
    const toRemove: string[] = [];
    root.classList.forEach((cls) => {
        if (cls.startsWith(CLASS_PREFIX)) toRemove.push(cls);
    });
    toRemove.forEach((cls) => root.classList.remove(cls));

    // Add the new one (skip for 'default')
    if (style !== 'default') {
        root.classList.add(`${CLASS_PREFIX}${style}`);
    }
}

const STORAGE_KEY = 'wordmates-color-style';

export function ColorStyleProvider({ children }: { children: ReactNode }) {
    const { profile, savePreferences } = useFirebase();
    const [colorStyle, setColorStyleState] = useState<UserColorStyle>('default');

    // Init from localStorage directly on mount to avoid loss
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = window.localStorage.getItem(STORAGE_KEY) as UserColorStyle;
            if (saved === 'palomichi' || saved === 'default') {
                setColorStyleState(saved);
                applyColorStyleClass(saved);
            }
        }
    }, []);

    // Sync from profile preference if it loads and differs
    useEffect(() => {
        if (profile?.preferences?.colorStyle) {
            const preferred = profile.preferences.colorStyle;
            setColorStyleState(preferred);
            applyColorStyleClass(preferred);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(STORAGE_KEY, preferred);
            }
        }
    }, [profile?.preferences?.colorStyle]);

    // Apply the class whenever the local state changes
    useEffect(() => {
        applyColorStyleClass(colorStyle);
    }, [colorStyle]);

    const setColorStyle = useCallback(
        (style: UserColorStyle) => {
            setColorStyleState(style);
            applyColorStyleClass(style);

            if (typeof window !== 'undefined') {
                window.localStorage.setItem(STORAGE_KEY, style);
            }

            if (profile) {
                if (isGuestProfile(profile)) {
                    updateGuestSessionColorStyle(style);
                } else {
                    void savePreferences({ colorStyle: style });
                }
            }
        },
        [profile, savePreferences],
    );

    return (
        <ColorStyleContext.Provider value={{ colorStyle, setColorStyle }}>
            {children}
        </ColorStyleContext.Provider>
    );
}

export function useColorStyle() {
    const ctx = useContext(ColorStyleContext);
    if (!ctx) {
        throw new Error('useColorStyle must be used within a ColorStyleProvider');
    }
    return ctx;
}
