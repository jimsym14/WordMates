'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, LogIn, LogOut, Settings, UserPlus, BarChart3, Volume2, VolumeX, Smartphone, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useColorStyle } from '@/components/color-style-provider';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { useFirebase } from '@/components/firebase-provider';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { isGuestProfile, type UserLanguage } from '@/types/user';
import { cn } from '@/lib/utils';
import { useFriendsModal } from '@/components/friends-modal-provider';
import { useNotifications } from '@/components/notifications-provider';
import { useSound } from '@/components/sound-provider';
import { useOnClickOutside } from '@/hooks/use-onclick-outside';
import { Switch } from '@/components/ui/switch';

const initials = (value?: string | null) => {
  if (!value) return 'WM';
  return value
    .split(/\s+/)
    .map((segment) => segment[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

type UserMenuProps = {
  className?: string;
  variant?: 'chip' | 'icon';
  onOpen?: () => void;
};

export function UserMenu({ className, variant = 'chip', onOpen }: UserMenuProps) {
  const router = useRouter();
  const { user, profile, signOut, savePreferences } = useFirebase();
  const [language, setLanguage] = useLocalStorage<UserLanguage>('wordmates-lang', 'EN');
  const { openFriendsModal } = useFriendsModal();
  const { unreadCount: notificationCount } = useNotifications();
  const { theme } = useTheme();
  const { colorStyle } = useColorStyle();
  const isPalomichi = colorStyle === 'palomichi';
  const isLightMode = theme === 'light';
  const { 
    volume, 
    isMuted, 
    hapticsEnabled, 
    setVolume, 
    setIsMuted, 
    setHapticsEnabled, 
    playSound,
    triggerHaptic 
  } = useSound();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(menuRef, () => {
    setIsOpen(false);
  });

  useEffect(() => {
    const preferred = profile?.preferences?.language;
    if (!preferred || preferred === language) return;
    setLanguage(preferred);
  }, [language, profile?.preferences?.language, setLanguage]);

  const toggleMenu = () => {
    if (!isOpen) {
      playSound('pop_tap');
      onOpen?.();
    }
    setIsOpen(!isOpen);
  };

  if (!user) {
    if (variant === 'icon') {
      return (
        <Button
          size="icon"
          variant="ghost"
          className={cn('h-12 w-12 rounded-full border border-border/50 text-white', className)}
          onClick={() => router.push('/login')}
          aria-label="Go to login"
        >
          <LogIn className="h-5 w-5" />
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant="ghost"
        className={cn('rounded-full border border-border/70 font-semibold', className)}
        onClick={() => router.push('/login')}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Login
      </Button>
    );
  }

  const guest = isGuestProfile(profile);
  const username = profile?.username ?? 'Player';
  const statusLabel = guest ? 'Guest' : 'Signed in';
  const triggerClasses =
    variant === 'icon'
      ? cn('relative flex h-12 w-12 items-center justify-center rounded-full border border-border/40 bg-black/30 p-0 text-white transition-all active:scale-95', className)
      : cn(
        'group flex min-w-[210px] items-center gap-4 rounded-full border border-border/50 px-6 py-4 text-sm font-semibold shadow-sm transition hover:border-border active:scale-95',
        'w-full justify-between sm:w-auto sm:justify-start',
        className
      );
  const avatarClasses = variant === 'icon' ? 'h-10 w-10 border border-border/40 shadow-inner' : 'h-12 w-12 border border-border/40 shadow-inner';

  return (
    <div className="relative inline-block" ref={menuRef}>
      <Button variant="ghost" onClick={toggleMenu} className={triggerClasses}>
        <span className="relative inline-flex">
          <Avatar className={avatarClasses}>
            <AvatarImage src={profile?.photoURL ?? undefined} alt={username} />
            <AvatarFallback>{initials(username)}</AvatarFallback>
          </Avatar>
        </span>
        {variant === 'chip' ? (
          <div className="flex flex-col text-left leading-tight">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-muted-foreground">{statusLabel}</p>
            <p className="text-base font-semibold leading-[1.35]">{username}</p>
          </div>
        ) : (
          <span className="sr-only">{`${statusLabel} as ${username}`}</span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 10, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.98 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cn(
              "absolute left-full top-0 z-[100] ml-2 w-72 rounded-[24px] border p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:ml-4",
              isPalomichi 
                ? "bg-[#FEEAF0] border-[#5E122F]/20 text-[#5E122F]" 
                : isLightMode 
                  ? "bg-[#FFFBF7] border-slate-200 text-slate-900" 
                  : "bg-[#121212] border-white/10 text-white"
            )}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex flex-col items-start gap-1 px-1">
              <p className="text-[0.6rem] uppercase tracking-[0.4em] text-muted-foreground">Profile</p>
              <p className="text-xl font-black tracking-tight">{username}</p>
            </div>

            <div className="space-y-4">
              {/* Sounds Section */}
              <div className={cn(
                "rounded-2xl p-3 px-3.5",
                isPalomichi ? "bg-[#5E122F]/5" : isLightMode ? "bg-black/5" : "bg-white/5"
              )}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg",
                      isMuted ? "bg-black/10 dark:bg-white/10" : "bg-primary/20"
                    )}>
                      {isMuted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-primary" />}
                    </div>
                    <span className="text-[0.7rem] font-black uppercase tracking-widest">Audio</span>
                  </div>
                  <button 
                    onClick={() => {
                      setIsMuted(!isMuted);
                      playSound('click_pallo');
                    }}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[0.6rem] font-black uppercase transition-all active:scale-95",
                      isMuted ? "bg-primary text-primary-foreground shadow-sm" : "bg-black/10 hover:bg-black/20 dark:bg-white/10"
                    )}
                  >
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Slider 
                    value={[isMuted ? 0 : volume * 100]} 
                    max={100} 
                    step={1} 
                    onValueChange={(vals) => {
                      setVolume(vals[0] / 100);
                      if (isMuted) setIsMuted(false);
                    }}
                    className={cn("w-full cursor-pointer", isMuted && "opacity-50")}
                  />
                  <span className="min-w-[1.8rem] text-right text-[0.6rem] font-mono font-bold tabular-nums opacity-60">
                    {isMuted ? '0' : Math.round(volume * 100)}
                  </span>
                </div>
              </div>

              {/* Haptics Section */}
              <div className={cn(
                "rounded-2xl p-3 px-3.5",
                isPalomichi ? "bg-[#5E122F]/5" : isLightMode ? "bg-black/5" : "bg-white/5"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg",
                      hapticsEnabled ? "bg-amber-400/20" : "bg-black/10 dark:bg-white/10"
                    )}>
                      <Zap className={cn("h-4 w-4", hapticsEnabled ? "text-amber-500" : "text-muted-foreground")} />
                    </div>
                    <div className="flex flex-col">
                    <span className={cn(
                      "text-[0.7rem] font-black uppercase tracking-widest leading-none",
                      isPalomichi ? "text-[#5E122F]" : ""
                    )}>Haptics</span>
                    <span className="text-[0.6rem] font-medium opacity-60">Tactile feedback</span>
                    </div>
                  </div>
                  <Switch 
                    checked={hapticsEnabled} 
                    onCheckedChange={(checked) => {
                      setHapticsEnabled(checked);
                      if (checked) {
                        playSound('click_pallo');
                        setTimeout(() => triggerHaptic('medium'), 50);
                      } else {
                        playSound('cancel');
                      }
                    }} 
                  />
                </div>
              </div>
 
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => {
                    handleLanguageChange(language === 'EN' ? 'EL' : 'EN');
                    playSound('click');
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                    isPalomichi ? "hover:bg-[#5E122F]/10" : "hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-left">Language</span>
                  <span className="text-[0.6rem] font-black uppercase text-primary">{language === 'EN' ? 'English' : 'Greek'}</span>
                </button>
 
                <button
                  onClick={() => {
                    openFriendsModal();
                    setIsOpen(false);
                    playSound('click');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <span>Friends & chats</span>
                </button>
 
                {!guest && (
                  <>
                    <button
                      onClick={() => {
                        router.push('/statistics');
                        setIsOpen(false);
                        playSound('click');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span>Statistics</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push('/settings');
                        setIsOpen(false);
                        playSound('click');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>Profile settings</span>
                    </button>
                  </>
                )}
 
                <div className="my-1 h-[1px] bg-black/5 dark:bg-white/5" />
 
                <button
                  onClick={() => {
                    void signOut();
                    setIsOpen(false);
                    playSound('quick_pop');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
