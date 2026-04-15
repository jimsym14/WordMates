'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Compass, Crown, User, UserPlus, Users, Newspaper } from 'lucide-react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useDragControls, animate } from 'framer-motion';

import { Logo } from '@/components/logo';
import { GraffitiBackground } from '@/components/graffiti-background';
import { ThemeToggle } from '@/components/theme-toggle';
import { SettingsModal } from '@/components/settings-modal';
import GreetingChanger from '@/components/greeting-changer';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { UserMenu } from '@/components/user-menu';
import { useFirebase } from '@/components/firebase-provider';
import { isGuestProfile } from '@/types/user';
import { cn } from '@/lib/utils';
import { useColorStyle } from '@/components/color-style-provider';
import { useOnlinePlayers } from '@/hooks/use-online-players';
import { useFriendsModal } from '@/components/friends-modal-provider';
import { useSound } from '@/components/sound-provider';
import { useOverviewStats, type LeaderboardStat } from '@/hooks/use-overview-stats';
import { LobbyInviteToast } from '@/components/lobby-invite-toast';
import { DailyNewspaperModal } from '@/components/daily/daily-newspaper-modal';
import { useDailyStats } from '@/hooks/use-daily-stats';
import type { GameType } from '@/types/game';

type PageMode = GameType | 'daily';

export default function Home() {
  const router = useRouter();
  const { profile, user } = useFirebase();
  const { playSound, triggerHaptic } = useSound();
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    gameType: GameType | null;
    inviteFriendId?: string;
    inviteFriendUsername?: string;
    prefilledPasscode?: string;
  }>({ isOpen: false, gameType: null });

  const [activeMode, setActiveMode] = useState<PageMode>('solo');
  const isMobile = useIsMobile();
  const guest = profile ? isGuestProfile(profile) : false;
  const signedIn = Boolean(user);
  const playerId = user?.uid ?? null;
  const statusLabel = signedIn ? (guest ? 'Guest mode' : 'Signed in') : 'Not signed in';
  const displayName = profile?.username ?? user?.displayName ?? (signedIn ? 'Player' : 'WordMates');
  const { count: livePlayersOnline, live: livePlayersEnabled } = useOnlinePlayers();
  const { resolvedTheme } = useTheme();
  const isLightMode = resolvedTheme === 'light';
  const { openFriendsModal, pendingRequestCount, unreadChatCount, setOnOpenInviteSettings } = useFriendsModal();
  const { colorStyle } = useColorStyle();
  const isPalomichi = colorStyle === 'palomichi';
  const heroGlowDark = 'radial-gradient(circle, hsl(var(--primary) / 0.55) 0%, hsl(var(--hero-glow-soft) / 0.9) 45%, hsl(var(--hero-glow-strong) / 0.08) 75%)';
  const heroGlowLight = isPalomichi
    ? 'radial-gradient(circle, rgba(232, 69, 139, 0.75) 0%, rgba(245, 152, 184, 0.7) 40%, rgba(253, 214, 229, 0.35) 65%, rgba(255, 184, 212, 0.12) 80%)'
    : 'radial-gradient(circle, rgba(255, 143, 53, 0.8) 0%, rgba(255, 193, 134, 0.78) 40%, rgba(255, 175, 110, 0.35) 65%, rgba(255, 160, 96, 0.12) 80%)';
  
  const dragY = useMotionValue(0);
  const dragControls = useDragControls();
  const [isExpanded, setIsExpanded] = useState(false);
  const [windowHeight, setWindowHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const internalScrollerRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const smoothScrollY = useSpring(scrollY, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const h = window.innerHeight;
      setWindowHeight(h);
      if (isMobile) {
        dragY.set(h * 0.65);
      }
    }
  }, [isMobile, dragY]);

  const scrollValue = isMobile ? dragY : smoothScrollY;
  
  // On mobile: 0 = fully expanded, peekY = collapsed peek state
  const logoScale = useTransform(
    scrollValue,
    isMobile ? [0, windowHeight * 0.65] : [0, 200],
    isMobile ? [0.4, 0.9] : [1, 0.4]
  );
  const logoOpacity = useTransform(
    scrollValue,
    isMobile ? [0, windowHeight * 0.35, windowHeight * 0.65] : [0, 60, 150],
    isMobile ? [0, 0.3, 1] : [1, 1, 0]
  );
  const logoY = useTransform(
    scrollValue,
    isMobile ? [0, windowHeight * 0.65] : [0, 150],
    isMobile ? [-40, 0] : [0, -30]
  );

  const heroGlowBackground = isLightMode ? heroGlowLight : heroGlowDark;

  // Register callback for opening settings modal with invite friend datar
  useEffect(() => {
    const handleOpenInviteSettings = (friendId: string, username: string, passcode: string) => {
      setModalState({
        isOpen: true,
        gameType: 'multiplayer',
        inviteFriendId: friendId,
        inviteFriendUsername: username,
        prefilledPasscode: passcode,
      });
    };
    setOnOpenInviteSettings(handleOpenInviteSettings);
  }, [setOnOpenInviteSettings]);

  const modeConfig: Record<
    PageMode,
    {
      title: string;
      subtitle: string;
      description: string;
      vibe: string;
      gradient: string;
      icon: typeof User;
      perks: string[];
    }
  > = {
    solo: {
      title: 'Solo',
      subtitle: 'Daily calm grind',
      description:
        'Dial in your Wordle grind with selectable word sizes, personal speed runs, and leaderboard climbs every time you clutch a solve.',
      vibe: 'Zen focus + gentle pressure',
      gradient: isPalomichi
        ? 'linear-gradient(135deg, #E8458B 0%, #F598B8 60%, #FDD6E5 100%)'
        : 'linear-gradient(135deg, #E37924 0%, #FFB347 60%, #FFD9A0 100%)',
      icon: User,
      perks: ['Custom word sizes', 'Timed mode', 'Leaderboard ready'],
    },
    multiplayer: {
      title: 'Multiplayer',
      subtitle: 'PvP & Co-op',
      description:
        'Jump into co-op boards or PvP bouts with customizable turn timers, match clocks, and word sizes that keep every round wild.',
      vibe: 'Arcade energy + team hype',
      gradient: isPalomichi
        ? 'linear-gradient(140deg, #B64090 0%, #9A3080 55%, #A03888 100%)'
        : 'linear-gradient(140deg, #658F41 0%, #76B66B 55%, #55A05E 100%)',
      icon: Users,
      perks: ['Co-op & PvP', 'Custom timers', 'Word size control'],
    },
    daily: {
      title: 'Daily Word',
      subtitle: 'Global Event',
      description: 'One word, one world. Join the daily ritual and compete with everyone.',
      vibe: 'Daily Ritual + Global Stats',
      gradient: isPalomichi
        ? 'linear-gradient(135deg, #FFB8D4 0%, #F175A5 50%, #E8458B 100%)'
        : 'linear-gradient(135deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)',
      icon: Newspaper,
      perks: ['Streaks', 'Global Stats', 'Newspaper'],
    },
  };

  const { stats: overviewStats, error: statsError } = useOverviewStats(playerId);

  const heroStats = useMemo(() => {
    const baselinePlayers = livePlayersEnabled && livePlayersOnline != null
      ? livePlayersOnline
      : overviewStats?.playersOnline ?? null;
    const minimumSelfPresence = signedIn || guest ? 1 : 0;
    const playersOnlineCount = baselinePlayers != null
      ? Math.max(baselinePlayers, minimumSelfPresence)
      : minimumSelfPresence > 0
        ? minimumSelfPresence
        : null;
    const playersOnlineValue = playersOnlineCount != null
      ? playersOnlineCount.toLocaleString('en-US')
      : '—';
    const selfOnlyHelper = minimumSelfPresence > 0 && (baselinePlayers == null || baselinePlayers < minimumSelfPresence);
    const playersOnlineHelper = !livePlayersEnabled
      ? 'Live view paused'
      : selfOnlyHelper
        ? 'Counting your active session'
        : undefined;

    const personalSolved = overviewStats?.userWordsSolvedToday;
    const solvedCount = personalSolved != null
      ? personalSolved
      : overviewStats?.wordsSolvedToday ?? null;
    const solvedValue = solvedCount != null ? solvedCount.toLocaleString('en-US') : '—';
    const solvedLabel = personalSolved != null ? 'Your words solved today' : 'Words solved today';

    return [
      {
        label: 'Players online',
        value: playersOnlineValue,
        helper: playersOnlineHelper,
      },
      {
        label: solvedLabel,
        value: solvedValue,
      },
    ];
  }, [guest, livePlayersEnabled, livePlayersOnline, overviewStats, signedIn]);

  const topFinders = useMemo(
    () => ([
      {
        label: 'Most words today',
        player: overviewStats?.mostWordsToday?.displayName ?? 'No data yet',
        count: overviewStats?.mostWordsToday?.count ?? 0,
      },
      {
        label: 'Monthly legend',
        player: overviewStats?.monthlyLegend?.displayName ?? 'No data yet',
        count: overviewStats?.monthlyLegend?.count ?? 0,
      },
    ]),
    [overviewStats]
  );

  const { streak, maxStreak, history: dailyHistory } = useDailyStats(profile);
  const solvedCount = dailyHistory ? Object.values(dailyHistory).filter(d => d.result === 'won').length : 0;

  const dailyStatsList = useMemo(() => ([
    { label: 'Current Streak', value: streak },
    { label: 'Best Streak', value: maxStreak },
    { label: 'Solved', value: solvedCount },
  ]), [streak, maxStreak, solvedCount]);

  const handleOpenModal = (type: PageMode) => {
    playSound('pop_tap');
    if (type === 'daily') {
      setShowDailyModal(true);
      setActiveMode('daily');
      return;
    }
    setModalState({ isOpen: true, gameType: type });
    setActiveMode(type);
  };

  const handleBrowseLobbies = () => {
    playSound('pop_tap');
    router.push('/lobbies');
  };

  const handleFriendsClick = () => {
    openFriendsModal();
  };

  const activeDetails = modeConfig[activeMode];

  const browseLobbiesButton = (
    <Button
      type="button"
      onClick={handleBrowseLobbies}
      className={cn(
        'group flex w-full items-center justify-center gap-3 rounded-[26px] border px-5 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] shadow-[0_18px_45px_rgba(0,0,0,0.18)] sm:px-6 sm:py-4 sm:text-xs sm:tracking-[0.4em]',
        isLightMode
          ? 'border-slate-200 bg-gradient-to-r from-[#ff8f3f] to-[#ffb347] text-slate-900'
          : 'border-white/20 bg-white/10 text-white'
      )}
    >
      <Compass className="h-4 w-4" /> Browse lobbies
    </Button>
  );

  const modesList = (
    <div className="flex flex-col gap-4 sm:gap-5">
      {(Object.entries(modeConfig) as [PageMode, (typeof modeConfig)['solo']][])
        .filter(([type]) => type !== 'daily')
        .map(([type, config]) => {
          const Icon = config.icon;
          const isActive = activeMode === type;
          const isVisuallyActive = isMobile || isActive;
          return (
            <motion.button
              key={type}
              type="button"
              onClick={() => handleOpenModal(type)}
              onMouseEnter={() => setActiveMode(type)}
              onFocus={() => setActiveMode(type)}
              aria-pressed={isActive}
              style={{ background: isVisuallyActive ? config.gradient : undefined }}
              className={cn(
                'mode-card group relative w-full overflow-hidden rounded-[28px] border p-5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isVisuallyActive
                  ? 'border-white/70 text-white shadow-[0_30px_90px_rgba(0,0,0,0.25)]'
                  : 'neu-card text-foreground dark:bg-card/70 dark:text-foreground/90'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/80 dark:bg-black/20 dark:text-white/80 sm:tracking-[0.3em]">
                  {config.subtitle}
                </span>
              </div>
              <h3 className="mt-4 flex items-center gap-3 text-2xl font-black uppercase tracking-[0.15em] sm:tracking-[0.25em]">
                <Icon className="h-6 w-6" />
                {config.title}
              </h3>
              <div
                className={cn(
                  'play-pill mt-4 flex items-center justify-between rounded-full border px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] shadow-sm transition-colors sm:text-sm sm:tracking-[0.3em]',
                  isVisuallyActive
                    ? 'border-white/70 bg-white/10 text-white'
                    : isLightMode
                      ? 'border-white/70 bg-gradient-to-r from-white/95 via-white/80 to-white/65 text-slate-900/80 shadow-[0_18px_45px_rgba(15,23,42,0.12)]'
                      : 'border-foreground/30 bg-foreground/10 text-foreground/80'
                )}
              >
                <span className="relative z-10">Play now</span>
                <motion.span
                  className={cn(
                    'relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent transition-colors',
                    isActive
                      ? 'bg-white/20 text-white'
                      : isLightMode
                        ? 'border-white/80 bg-white text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.18)]'
                        : 'bg-foreground/5 text-foreground'
                  )}
                  animate={{ x: isActive ? 6 : 0 }}
                >
                  →
                </motion.span>
              </div>
            </motion.button>
          );
        })}
    </div>
  );

  const dailyConfig = modeConfig['daily'];
  const isDailyActive = activeMode === 'daily';
  const isDailyVisuallyActive = isMobile || isDailyActive;

  const dailyButton = (
    <motion.button
      type="button"
      onClick={() => handleOpenModal('daily')}
      onMouseEnter={() => setActiveMode('daily')}
      onFocus={() => setActiveMode('daily')}
      aria-pressed={isDailyActive}
      style={{ background: isDailyVisuallyActive ? dailyConfig.gradient : undefined }}
      className={cn(
        'group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full border px-6 py-4 text-sm font-black uppercase tracking-[0.2em] shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-base sm:tracking-[0.25em]',
        isDailyVisuallyActive
          ? 'border-white/70 text-white shadow-[0_30px_90px_rgba(0,0,0,0.25)]'
          : isLightMode
            ? 'border-white/70 bg-gradient-to-r from-white/95 via-white/80 to-white/65 text-slate-900/80 shadow-[0_18px_45px_rgba(15,23,42,0.12)]'
            : 'border-foreground/30 bg-foreground/10 text-foreground/80'
      )}
    >
      <Newspaper className="h-5 w-5 sm:h-6 sm:w-6" />
      {dailyConfig.title}
      <motion.span
        className={cn(
          'ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-transparent transition-colors sm:h-8 sm:w-8',
          isDailyActive
            ? 'bg-white/20 text-white'
            : isLightMode
              ? 'border-white/80 bg-white text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.18)]'
              : 'bg-foreground/5 text-foreground'
        )}
        animate={{ x: isDailyActive ? 4 : 0 }}
      >
        →
      </motion.span>
    </motion.button>
  );

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-start animate-theme",
        isMobile ? "h-screen overflow-hidden px-0 pt-0" : "px-4 pt-10 pb-12 sm:px-6 sm:pt-12 overflow-visible animate-theme"
      )}
    >
      <DailyNewspaperModal manualOpen={showDailyModal} onClose={() => setShowDailyModal(false)} />
      <div className="pointer-events-none absolute inset-0 -z-10">
        {isLightMode && (
          <div
            className={cn(
              'absolute inset-0',
              isPalomichi
                ? 'bg-[radial-gradient(130%_95%_at_18%_10%,rgba(248,224,234,0.82)_0%,rgba(255,250,253,0.96)_45%,rgba(246,248,236,0.95)_100%)]'
                : 'bg-[radial-gradient(130%_95%_at_18%_10%,rgba(247,236,219,0.82)_0%,rgba(255,253,249,0.96)_45%,rgba(238,245,230,0.95)_100%)]'
            )}
          />
        )}
        {!isMobile && (
          <GraffitiBackground
            position="absolute"
            zIndex={0}
            className="opacity-95"
          />
        )}
        <div
          className="absolute left-1/2 top-24 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-[140px]"
          style={{ background: heroGlowBackground }}
        />
      </div>

      <motion.div
        className={cn(
          "relative z-10 w-full text-center sm:px-0 flex flex-col items-center justify-center cursor-pointer",
          isMobile ? "h-[65vh] shrink-0" : "px-4"
        )}
        style={isMobile ? { scale: logoScale, opacity: logoOpacity, y: logoY } : {}}
        onClick={() => {
          playSound('pop_tap');
          router.push('/');
        }}
      >
        {isMobile && <GraffitiBackground position="absolute" zIndex={0} className="opacity-60" />}
        <Logo className={isMobile ? "w-[340px] h-auto" : ""} />
      </motion.div>

      <motion.section
        ref={panelRef}
        drag={isMobile ? 'y' : false}
        dragControls={dragControls}
        dragListener={isMobile ? (!isExpanded || isDragging) : false}
        dragConstraints={isMobile ? { top: 0, bottom: windowHeight * 0.65 } : false}
        dragElastic={0.05}
        onDragEnd={(_, info) => {
          if (!isMobile) return;
          const peekY = windowHeight * 0.65;
          const velocity = info.velocity.y;
          const currentY = dragY.get();

          // Snappy Snap Logic: Easier to snap up (requires only 20% drag)
          if (velocity < -50 || currentY < peekY * 0.8) {
            animate(dragY, 0, { type: 'spring', damping: 40, stiffness: 450, restDelta: 0.1 });
            setIsExpanded(true);
            triggerHaptic('medium');
          } else {
            animate(dragY, peekY, { type: 'spring', damping: 40, stiffness: 450, restDelta: 0.1 });
            setIsExpanded(false);
            triggerHaptic('medium');
          }
        }}
        onPointerUp={() => {
          if (isMobile) triggerHaptic('light'); // Immediate release feedback
        }}
        style={isMobile ? { y: dragY, touchAction: isExpanded && !isDragging ? 'auto' : 'none' } : { overflowY: 'visible' }}
        className={cn(
          'neu-shell relative z-20 w-full max-w-4xl rounded-t-[32px] !rounded-b-none backdrop-blur-xl sm:rounded-[36px] sm:!rounded-b-[36px] flex flex-col',
          isMobile 
            ? 'fixed top-0 left-0 right-0 h-screen shadow-[0_-15px_60px_rgba(0,0,0,0.6)] !transition-none' 
            : 'relative mt-8 sm:mt-10 overflow-visible overflow-y-visible h-auto p-5 sm:p-10',
          isLightMode
            ? isPalomichi
              ? 'bg-[#FFF9FC] text-slate-900 transition-[background] duration-700 ease-out sm:bg-[#FFF9FC]'
              : 'bg-[#FFFCF8] text-slate-900 transition-[background] duration-700 ease-out sm:bg-[#FFFCF8]'
            : 'bg-[#121212] text-white sm:bg-transparent'
        )}
      >
        {/* Universal Top Header (Handle + Profile + Greeting) */}
        {isMobile && (
          <div 
            className="flex w-full shrink-0 flex-col items-center justify-start pt-4 pb-4 active:scale-[0.99] transition-all z-[50] relative transform-gpu"
            style={{ cursor: 'grab', touchAction: 'none' }}
            onPointerDown={(e) => {
              dragControls.start(e);
              triggerHaptic('light');
            }}
            onPointerUp={() => triggerHaptic('medium')}
            onClick={(e) => {
              // Exclude clicks on interactive buttons (Profile Pill, Theme Toggle, etc.)
              if ((e.target as HTMLElement).closest('button')) return;
              
              const peekY = windowHeight * 0.65;
              const nextExpanded = !isExpanded;
              
              if (nextExpanded) {
                animate(dragY, 0, { type: 'spring', damping: 40, stiffness: 450, restDelta: 0.1 });
              } else {
                animate(dragY, peekY, { type: 'spring', damping: 40, stiffness: 450, restDelta: 0.1 });
              }
              
              setIsExpanded(nextExpanded);
              triggerHaptic('medium');
            }}
          >
            {/* Visual Handle Bar */}
            <div className="h-1.5 w-14 rounded-full bg-foreground/15 backdrop-blur-md mb-6" />

            {/* Profile Pill Row (Restored to top) */}
            <div className="relative z-10 mb-4 w-full px-4 transform-gpu">
              <div
                className={cn(
                  'flex w-full items-center gap-3 rounded-[28px] px-4 py-3 text-sm transition-colors duration-300 sm:gap-5 backdrop-blur-3xl',
                  isLightMode
                    ? 'bg-[#FFFFFD] shadow-[0_16px_34px_rgba(108,133,78,0.12),0_10px_24px_rgba(231,141,72,0.14)] text-slate-900'
                    : 'border border-white/15 bg-black/40 text-white shadow-[inset_6px_6px_18px_rgba(0,0,0,0.5),inset_-4px_-4px_12px_rgba(255,255,255,0.05)]'
                )}
              >
                <div className="flex flex-1 items-center gap-3">
                  <UserMenu 
                    variant="icon" 
                    className="h-11 w-11 shrink-0" 
                    onOpen={() => {
                      if (!isExpanded) {
                        const peekY = windowHeight * 0.65;
                        animate(dragY, 0, { type: 'spring', damping: 40, stiffness: 450, restDelta: 0.1 });
                        setIsExpanded(true);
                        triggerHaptic('medium');
                      }
                    }}
                  />
                  <div className="min-w-0">
                    <p className={cn('text-[0.55rem] uppercase tracking-[0.4em]', isLightMode ? 'text-slate-600' : 'text-white/60')}>
                      {statusLabel}
                    </p>
                    <p className={cn('truncate text-base font-semibold', isLightMode ? 'text-slate-900' : 'text-white')} title={displayName}>
                      {displayName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleFriendsClick}
                    className={cn(
                      'relative h-10 w-10 border bg-transparent',
                      isLightMode ? 'border-slate/60 bg-white/60 text-slate-900' : 'border-white/25 text-white'
                    )}
                  >
                    <UserPlus className="h-5 w-5" />
                    {(pendingRequestCount > 0 || unreadChatCount > 0) && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.3rem] items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] font-semibold text-destructive-foreground animate-shake-periodic">
                        {pendingRequestCount + unreadChatCount > 99 ? '99+' : pendingRequestCount + unreadChatCount}
                      </span>
                    )}
                  </Button>
                  <ThemeToggle
                    className={cn(
                      'h-10 w-10 rounded-full border',
                      isLightMode ? 'border-slate/60 bg-white/60 text-slate-900' : 'border-white/25 text-white'
                    )}
                  />
                </div>
              </div>
            </div>
            
            {/* The greeting text */}
            <div className="w-full px-4 overflow-hidden pointer-events-none mt-1">
              <GreetingChanger />
            </div>
          </div>
        )}

        <div
          ref={isMobile ? internalScrollerRef : undefined}
          className={cn(
            "w-full flex flex-col",
            isMobile
              ? "h-full overflow-y-auto overscroll-contain px-5 pb-40"
              : "h-auto max-h-none overflow-visible overflow-y-visible"
          )}
          onScroll={isMobile ? (e) => {
            const target = e.currentTarget;
            // More lenient threshold for top detection to capture drag earlier
            if (target.scrollTop <= 10) {
              setIsDragging(true);
            } else {
              setIsDragging(false);
            }
          } : undefined}
        >
        <div className="pointer-events-none absolute inset-0 rounded-[36px] border border-white/5" />
        <div className="pointer-events-none absolute -right-16 top-8 h-64 w-64 rounded-full blur-[140px] opacity-70" style={{ background: activeDetails.gradient }} />




        {!isMobile && (
          <div className="relative z-40 mb-6">
            <div className="relative z-10 w-full px-4 transform-gpu">
              <div
                className={cn(
                  'flex w-full items-center gap-3 rounded-[28px] px-4 py-3 text-sm transition-colors duration-300 sm:gap-5 backdrop-blur-3xl',
                  isLightMode
                    ? 'bg-[#FFFBF7] shadow-[0_8px_20px_rgba(0,0,0,0.1)] text-slate-900'
                    : 'border border-white/15 bg-black/40 text-white shadow-[inset_6px_6px_18px_rgba(0,0,0,0.5),inset_-4px_-4px_12px_rgba(255,255,255,0.05)]'
                )}
              >
                <div className="flex flex-1 items-center gap-3">
                  <UserMenu
                    variant="icon"
                    className="h-11 w-11 shrink-0"
                    onOpen={() => {
                      if (!isExpanded) {
                        const peekY = windowHeight * 0.65;
                        animate(dragY, 0, { type: 'spring', damping: 40, stiffness: 450, restDelta: 0.1 });
                        setIsExpanded(true);
                        triggerHaptic('medium');
                      }
                    }}
                  />
                  <div className="min-w-0">
                    <p className={cn('text-[0.55rem] uppercase tracking-[0.4em]', isLightMode ? 'text-slate-600' : 'text-white/60')}>
                      {statusLabel}
                    </p>
                    <p className={cn('truncate text-base font-semibold', isLightMode ? 'text-slate-900' : 'text-white')} title={displayName}>
                      {displayName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleFriendsClick}
                    className={cn(
                      'relative h-10 w-10 border bg-transparent',
                      isLightMode ? 'border-slate/60 bg-white/60 text-slate-900' : 'border-white/25 text-white'
                    )}
                  >
                    <UserPlus className="h-5 w-5" />
                    {(pendingRequestCount > 0 || unreadChatCount > 0) && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.3rem] items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] font-semibold text-destructive-foreground animate-shake-periodic">
                        {pendingRequestCount + unreadChatCount > 99 ? '99+' : pendingRequestCount + unreadChatCount}
                      </span>
                    )}
                  </Button>
                  <ThemeToggle
                    className={cn(
                      'h-10 w-10 rounded-full border',
                      isLightMode ? 'border-slate/60 bg-white/60 text-slate-900' : 'border-white/25 text-white'
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
          <div className="space-y-8">
            <div className="hidden text-center lg:block lg:mt-8">
              <GreetingChanger />
            </div>
            <div
              className={cn(
                'lg:hidden rounded-[32px] p-4',
                isLightMode ? 'bg-[#FFFFFD] shadow-[0_18px_40px_rgba(108,133,78,0.1),0_10px_24px_rgba(231,141,72,0.12)] text-slate-900' : 'neu-card'
              )}
            >
              <p className="text-center text-xs font-semibold uppercase tracking-[0.5em] text-muted-foreground">Modes</p>
              <div className="mt-4 space-y-4">
                <div className="mb-4">{dailyButton}</div>
                {modesList}
                {browseLobbiesButton}
              </div>
            </div>
            <Separator className="border-border/70 lg:-mt-2" />
            <div
              className={cn(
                'grid gap-4 rounded-3xl p-4 sm:grid-cols-2',
                isLightMode ? 'glass-panel-soft' : 'neu-card'
              )}
            >
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    'rounded-2xl p-4',
                    isLightMode ? 'bg-[#FFFFFD] shadow-[0_12px_30px_rgba(108,133,78,0.1),0_8px_18px_rgba(231,141,72,0.1)] text-slate-900' : 'neu-card sunset-card'
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{stat.value}</p>
                  {stat.helper && (
                    <p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p>
                  )}
                </div>
              ))}
            </div>
            {statsError && (
              <p className="text-center text-xs text-rose-400">{statsError}</p>
            )}
            <div
              className={cn(
                'grid gap-4 rounded-3xl p-4 sm:grid-cols-2',
                isLightMode ? 'glass-panel-soft' : 'neu-card'
              )}
            >
              {topFinders.map((finder) => (
                <div
                  key={finder.label}
                  className={cn(
                    'rounded-2xl p-4',
                    isLightMode ? 'bg-[#FFFFFD] shadow-[0_12px_30px_rgba(108,133,78,0.1),0_8px_18px_rgba(231,141,72,0.1)] text-slate-900' : 'neu-card sunset-card'
                  )}
                >
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    <Crown className="h-4 w-4 text-amber-400" />
                    {finder.label}
                  </p>
                  <p className="mt-3 text-lg font-semibold">{finder.player}</p>
                  <p className="text-sm text-muted-foreground">{finder.count} words solved</p>
                </div>
              ))}
            </div>

            {/* Daily Stats Section */}
            <div
              className={cn(
                'grid gap-4 rounded-3xl p-4 sm:grid-cols-3 mt-4',
                isLightMode ? 'glass-panel-soft' : 'neu-card'
              )}
            >
              <div className="col-span-full mb-2">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  <Newspaper className="h-4 w-4 text-[hsl(var(--primary))]" />
                  Daily Performance
                </p>
              </div>
              {dailyStatsList.map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    'rounded-2xl p-4',
                    isLightMode ? 'bg-[#FFFFFD] shadow-[0_12px_30px_rgba(108,133,78,0.1),0_8px_18px_rgba(231,141,72,0.1)] text-slate-900' : 'neu-card sunset-card'
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden space-y-5 lg:block">
            <p
              className={cn(
                'text-center text-xs font-semibold uppercase tracking-[0.5em] text-muted-foreground',
                isMobile ? '' : 'mt-8'
              )}
            >
              Modes
            </p>
            <div className="mb-4">{dailyButton}</div>
            {modesList}
            <div className="pt-2">{browseLobbiesButton}</div>
          </div>
        </div>
        {isMobile && <div className="h-4 w-full shrink-0" />}
      </div>
    </motion.section>

      <SettingsModal
        isOpen={modalState.isOpen}
        gameType={modalState.gameType}
        onClose={() => setModalState({ isOpen: false, gameType: null })}
        inviteFriendId={modalState.inviteFriendId}
        inviteFriendUsername={modalState.inviteFriendUsername}
        prefilledPasscode={modalState.prefilledPasscode}
      />
      <LobbyInviteToast />
    </div>
  );
}
