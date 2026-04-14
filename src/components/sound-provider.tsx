'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SoundID = 
  | 'cancel' 
  | 'click' 
  | 'click_pallo' 
  | 'draw' 
  | 'paper_open' 
  | 'paper_close' 
  | 'notif_default' 
  | 'notif_slow' 
  | 'pop_tap' 
  | 'quick_pop' 
  | 'ready' 
  | 'success_green' 
  | 'success_orange' 
  | 'tap' 
  | 'wrong' 
  | 'loss' 
  | 'win';

export type HapticType = 'light' | 'medium' | 'success' | 'warning' | 'heavy';

interface SoundContextType {
  volume: number;
  isMuted: boolean;
  hapticsEnabled: boolean;
  setVolume: (volume: number) => void;
  setIsMuted: (isMuted: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  playSound: (id: SoundID) => void;
  triggerHaptic: (type: HapticType) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

const SOUND_URLS: Record<SoundID, string> = {
  cancel: '/sounds/cancel.mp3',
  click: '/sounds/click.mp3',
  click_pallo: '/sounds/colorful click.mp3',
  draw: '/sounds/draw.mp3',
  paper_open: '/sounds/newspaper open.mp3',
  paper_close: '/sounds/newspaper close.mp3',
  notif_default: '/sounds/notification default.mp3',
  notif_slow: '/sounds/notification slow.mp3',
  pop_tap: '/sounds/pop tap.mp3',
  quick_pop: '/sounds/quick pop.mp3',
  ready: '/sounds/ready.mp3',
  success_green: '/sounds/success green.mp3',
  success_orange: '/sounds/success orange.mp3',
  tap: '/sounds/tap.mp3',
  wrong: '/sounds/wrong.mp3',
  loss: '/sounds/loss.mp3',
  win: '/sounds/win.mp3',
};

const SOUND_DESCRIPTIONS: Record<SoundID, string> = {
  cancel: 'Closing/Cancelling action or backdrop click',
  click: 'Standard button click inside a UI/Modal',
  click_pallo: 'Switch or Toggle activation',
  draw: 'Game ended in a draw',
  paper_open: 'Opening the Daily Newspaper',
  paper_close: 'Closing the Daily Newspaper',
  notif_default: 'Standard system notification',
  notif_slow: 'High-priority or slow notification',
  pop_tap: 'Interaction that opens a modal/menu',
  quick_pop: 'Default quick button interaction',
  ready: 'Joining a lobby or starting a match',
  success_green: 'Guess result with at least one green letter',
  success_orange: 'Guess result with orange (but no green) letters',
  tap: 'Keyboard or general typing input',
  wrong: 'Guess result with zero matching letters',
  loss: 'Game outcome - Defeat',
  win: 'Game outcome - Victory',
};

interface SoundLog {
  id: string;
  soundId: SoundID;
  timestamp: number;
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [volume, setVolumeState] = useState(0.5);
  const [isMuted, setIsMutedState] = useState(false);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [debugLogs, setDebugLogs] = useState<SoundLog[]>([]);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    setIsLocalhost(window.location.hostname === 'localhost');
  }, []);

  // Initialize from localStorage
  useEffect(() => {
    const savedVolume = localStorage.getItem('wordmates-volume');
    const savedMuted = localStorage.getItem('wordmates-muted');
    const savedHaptics = localStorage.getItem('wordmates-haptics');

    if (savedVolume !== null) setVolumeState(parseFloat(savedVolume));
    if (savedMuted !== null) setIsMutedState(savedMuted === 'true');
    if (savedHaptics !== null) setHapticsEnabledState(savedHaptics === 'true');
  }, []);

  const setVolume = (v: number) => {
    setVolumeState(v);
    localStorage.setItem('wordmates-volume', v.toString());
  };

  const setIsMuted = (m: boolean) => {
    setIsMutedState(m);
    localStorage.setItem('wordmates-muted', m.toString());
  };

  const setHapticsEnabled = (h: boolean) => {
    setHapticsEnabledState(h);
    localStorage.setItem('wordmates-haptics', h.toString());
  };

  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const hapticsEnabledRef = useRef(hapticsEnabled);

  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    hapticsEnabledRef.current = hapticsEnabled;
  }, [volume, isMuted, hapticsEnabled]);

  const hapticRef = useRef<{ input: HTMLInputElement; label: HTMLLabelElement } | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    // Create a SINGLE persistent hidden switch for iOS haptics
    // Placing it far off-screen to avoid any coordinate-math interference (hitbox issues)
    const container = document.createElement('div');
    const input = document.createElement('input');
    const label = document.createElement('label');
    const id = 'h-trig-stable-v3';
    
    input.type = 'checkbox';
    input.setAttribute('switch', ''); 
    input.id = id;
    label.setAttribute('for', id);
    
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-9999';
    container.style.overflow = 'hidden';
    
    container.appendChild(input);
    container.appendChild(label);
    document.body.appendChild(container);
    
    hapticRef.current = { input, label };
    
    return () => {
      document.body.removeChild(container);
    };
  }, []);

  const triggerHaptic = useCallback((type: HapticType) => {
    if (!hapticsEnabledRef.current || typeof navigator === 'undefined') return;

    // Detect iOS for the switch hack
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

    if (isIOS && hapticRef.current) {
      // --- iOS 18+ Persistent Switch Hack ---
      const { input, label } = hapticRef.current;
      
      // Manually toggling 'checked' state often helps fire the haptic pulse reliably
      const toggle = () => {
        input.checked = !input.checked;
        label.click();
      };

      if (type === 'success' || type === 'warning' || type === 'heavy') {
        toggle();
        setTimeout(toggle, 80);
      } else {
        toggle();
      }
    } else if (navigator.vibrate) {
      // --- Android / Standard Web Vibrate ---
      const patterns: Record<HapticType, number | number[]> = {
        light: 8,
        medium: 15,
        success: [40, 60, 40],
        warning: [80, 40, 80],
        heavy: [100, 50, 100],
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  const playSound = useCallback((soundId: SoundID) => {
    // Map certain sounds to automated haptics
    if (['tap', 'cancel'].includes(soundId)) triggerHaptic('light');
    else if (['click', 'pop_tap', 'quick_pop', 'paper_open', 'paper_close'].includes(soundId)) triggerHaptic('medium');
    else if (['success_green', 'success_orange'].includes(soundId)) triggerHaptic('success');
    else if (soundId === 'wrong') triggerHaptic('warning');
    else if (['win', 'loss'].includes(soundId)) triggerHaptic('heavy');

    if (isMutedRef.current) return;

    // Log to debug console if on localhost
    if (window.location.hostname === 'localhost') {
      const logId = Math.random().toString(36).substring(7);
      setDebugLogs((prev) => [{ id: logId, soundId, timestamp: Date.now() }, ...prev].slice(0, 3));
      
      // Auto-remove log after 3 seconds
      setTimeout(() => {
        setDebugLogs((prev) => prev.filter(log => log.id !== logId));
      }, 3000);
    }

    // Lazy load audio
    if (!audioRefs.current[soundId]) {
      audioRefs.current[soundId] = new Audio(SOUND_URLS[soundId]);
    }

    const audio = audioRefs.current[soundId];
    audio.volume = volumeRef.current;
    audio.currentTime = 0;
    audio.play().catch(e => console.warn('Sound playback failed:', e));
  }, [triggerHaptic]);

  const value = useMemo(() => ({
    volume,
    isMuted,
    hapticsEnabled,
    setVolume,
    setIsMuted,
    setHapticsEnabled,
    playSound,
    triggerHaptic
  }), [volume, isMuted, hapticsEnabled, setVolume, setIsMuted, setHapticsEnabled, playSound, triggerHaptic]);

  return (
    <SoundContext.Provider value={value}>
      {children}
      
      {/* Visual Debugger Overlay */}
      {isLocalhost && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
          <AnimatePresence>
            {debugLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="flex flex-col items-end rounded-2xl border border-white/20 bg-black/80 p-3 shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[0.65rem] font-black uppercase tracking-widest text-primary truncate max-w-[120px]">
                    {SOUND_URLS[log.soundId]?.split('/').pop() || 'Unknown'}
                  </span>
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                </div>
                <p className="mt-1 text-xs font-bold text-white/90">
                  {log.soundId.toUpperCase()}
                </p>
                <p className="mt-0.5 text-[0.6rem] text-white/60 text-right italic leading-tight max-w-[180px]">
                  {SOUND_DESCRIPTIONS[log.soundId]}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}
