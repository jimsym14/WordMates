'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FirebaseError } from 'firebase/app';
import { updateEmail, updatePassword, updateProfile } from 'firebase/auth';
import { ArrowLeft, Sparkles, Check } from 'lucide-react';
import { useTheme } from 'next-themes';

import { useFirebase } from '@/components/firebase-provider';
import { useColorStyle } from '@/components/color-style-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { isUsernameAvailable, sanitizeUsername, upsertProfile } from '@/lib/profiles';
import { DEFAULT_PREFERENCES, isGuestProfile, type UserColorStyle } from '@/types/user';
import { cn } from '@/lib/utils';

const passwordField = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? '');

const urlField = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? '')
  .refine((value) => value.length === 0 || /^https?:\/\//i.test(value), {
    message: 'Enter a valid image URL',
  });

const settingsSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Pick something at least 3 characters long')
      .max(20, 'Keep it under 20 characters'),
    email: z.string().email('Enter a valid email').transform((value) => value.trim()),
    photoURL: urlField,
    newPassword: passwordField,
    confirmPassword: passwordField,
  })
  .superRefine((data, ctx) => {
    if (data.newPassword && data.newPassword.length > 0) {
      if (!data.confirmPassword || data.confirmPassword.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['confirmPassword'],
          message: 'Confirm your password',
        });
      } else if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['confirmPassword'],
          message: 'Passwords do not match',
        });
      }
    }
  });

type SettingsValues = z.infer<typeof settingsSchema>;

const initials = (value?: string) => {
  if (!value) return 'WM';
  return value
    .split(/\s+/)
    .map((segment) => segment[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

interface StyleOption {
  value: UserColorStyle;
  label: string;
  swatches: string[];
}

const COLOR_STYLE_OPTIONS: StyleOption[] = [
  {
    value: 'default',
    label: 'Default',
    swatches: ['#F97316', '#68A85A', '#F5E6D3', '#1E293B', '#FFFFFF'],
  },
  {
    value: 'palomichi',
    label: 'Palomichi',
    swatches: ['#E8458B', '#B64090', '#FDE8F0', '#1A0D14', '#FFFFFF'],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth, db, user, profile } = useFirebase();
  const { colorStyle, setColorStyle } = useColorStyle();
  const { resolvedTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const isPalomichi = colorStyle === 'palomichi';
  const isLightMode = resolvedTheme === 'light';

  const defaultValues = useMemo<SettingsValues>(() => ({
    username: profile?.username ?? user?.displayName ?? '',
    email: profile?.email ?? user?.email ?? '',
    photoURL: profile?.photoURL ?? user?.photoURL ?? '',
    newPassword: '',
    confirmPassword: '',
  }), [profile?.email, profile?.photoURL, profile?.username, user?.displayName, user?.email, user?.photoURL]);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (profile && isGuestProfile(profile)) {
      router.replace('/');
    }
  }, [profile, router, user]);

  const previewPhoto = form.watch('photoURL') || defaultValues.photoURL;

  const handleSubmit = async (values: SettingsValues) => {
    if (!auth || !db || !user) return;
    setIsSaving(true);
    try {
      const cleanUsername = sanitizeUsername(values.username);
      if (!cleanUsername) {
        form.setError('username', { message: 'Username is required' });
        setIsSaving(false);
        return;
      }

      if (cleanUsername !== (profile?.username ?? '')) {
        const available = await isUsernameAvailable(db, cleanUsername, user.uid);
        if (!available) {
          form.setError('username', { message: 'That handle is already taken.' });
          setIsSaving(false);
          return;
        }
      }

      if (values.email !== user.email) {
        await updateEmail(user, values.email);
      }

      if (values.newPassword) {
        await updatePassword(user, values.newPassword);
      }

      const resolvedPhoto = values.photoURL || null;

      await updateProfile(user, {
        displayName: cleanUsername,
        photoURL: resolvedPhoto,
      });

      await upsertProfile(db, user.uid, {
        username: cleanUsername,
        authProvider: profile?.authProvider ?? 'password',
        email: values.email,
        photoURL: resolvedPhoto,
        avatarSeed: profile?.avatarSeed ?? cleanUsername,
        preferences: profile?.preferences ?? DEFAULT_PREFERENCES,
      });

      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved.',
      });
      router.push('/');
    } catch (error) {
      console.error('Failed to update profile', error);
      const friendlyMessage =
        error instanceof FirebaseError && error.code === 'auth/requires-recent-login'
          ? 'Please reauthenticate and try again.'
          : error instanceof Error
            ? error.message
            : 'Unable to save changes right now.';
      toast({ variant: 'destructive', title: 'Update failed', description: friendlyMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const heading = profile ? `Hi ${profile.username}, make it yours` : 'Update your profile';

  return (
    <div className="relative min-h-screen px-4 py-12 text-slate-900 overflow-hidden dark:text-white transition-colors duration-500">
      {/* ── Background Crossfade ── */}
      <div 
        className={cn(
          "absolute inset-0 -z-20 bg-gradient-to-b from-orange-50 via-amber-50 to-[#ffd8a8] dark:from-[#0c0401] dark:via-[#120601] dark:to-[#1e0900] transition-opacity duration-700 ease-in-out", 
          !isPalomichi ? "opacity-100" : "opacity-0"
        )} 
      />
      <div 
        className={cn(
          "absolute inset-0 -z-20 bg-gradient-to-b from-rose-50 via-pink-50 to-[#ffc4d9] dark:from-[#180811] dark:via-[#240c1a] dark:to-[#331124] transition-opacity duration-700 ease-in-out", 
          isPalomichi ? "opacity-100" : "opacity-0"
        )} 
      />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="rounded-full border border-black/10 text-slate-800 dark:border-white/20 dark:text-white" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back home
          </Button>
          <Sparkles className="h-5 w-5 text-orange-200 transition-colors duration-500 ease-in-out" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="overflow-hidden rounded-[40px] border border-black/5 bg-white/60 p-6 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_40px_140px_rgba(0,0,0,0.45)]"
        >
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-[0.3em]">{heading}</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-white/70">Update your handle, contact info, and security details all in one place.</p>

              {/* ── Color Style Selector ── */}
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-500 mb-3 dark:text-white/60">Color Style</p>
                <div className="flex gap-3">
                  {COLOR_STYLE_OPTIONS.map((option) => {
                    const isActive = colorStyle === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setColorStyle(option.value)}
                        className={cn(
                          'group relative flex flex-1 flex-col items-center gap-2.5 rounded-2xl border-2 p-4 transition-all duration-200',
                          isActive
                            ? 'border-black/20 bg-black/5 shadow-[0_0_30px_rgba(0,0,0,0.05)] dark:border-white/60 dark:bg-white/10 dark:shadow-[0_0_30px_rgba(255,255,255,0.08)]'
                            : 'border-black/5 bg-black/[0.03] hover:border-black/10 hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25 dark:hover:bg-white/[0.06]'
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="color-style-check"
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 shadow-md dark:bg-white"
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          >
                            <Check className="h-3 w-3 text-white dark:text-black" />
                          </motion.div>
                        )}
                        <div className="flex gap-1">
                          {option.swatches.map((color, i) => (
                            <div
                              key={i}
                              className="h-5 w-5 rounded-full border border-black/10 shadow-inner dark:border-white/20"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className={cn(
                          'text-xs font-bold uppercase tracking-[0.3em] transition-colors',
                          isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 group-hover:text-slate-700 dark:text-white/50 dark:group-hover:text-white/70'
                        )}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Form {...form}>
                <form className="mt-6 space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-2xl border-black/10 bg-white/50 px-4 py-5 text-slate-900 placeholder:text-slate-500 dark:border-white/30 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} className="rounded-2xl border-black/10 bg-white/50 px-4 py-5 text-slate-900 placeholder:text-slate-500 dark:border-white/30 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="photoURL"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile image URL</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-2xl border-black/10 bg-white/50 px-4 py-5 text-slate-900 placeholder:text-slate-500 dark:border-white/30 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50" placeholder="https://" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} className="rounded-2xl border-black/10 bg-white/50 px-4 py-5 text-slate-900 placeholder:text-slate-500 dark:border-white/30 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} className="rounded-2xl border-black/10 bg-white/50 px-4 py-5 text-slate-900 placeholder:text-slate-500 dark:border-white/30 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full rounded-2xl bg-slate-900 py-5 text-base font-semibold uppercase tracking-[0.3em] text-white hover:bg-slate-800 dark:bg-white/90 dark:text-slate-900 dark:hover:bg-white" disabled={isSaving}>
                    {isSaving ? 'Saving…' : 'Save profile'}
                  </Button>
                </form>
              </Form>
            </div>

            <div className="rounded-[32px] border border-black/5 bg-white/40 p-5 text-center shadow-lg dark:border-white/15 dark:bg-white/5 dark:shadow-inner dark:shadow-black/30">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-white/60">Preview</p>
              <Avatar className="mx-auto mt-4 h-28 w-28 rounded-[30px] border-4 border-white/80 dark:border-white/30">
                <AvatarImage src={previewPhoto || undefined} alt={defaultValues.username} />
                <AvatarFallback>{initials(defaultValues.username)}</AvatarFallback>
              </Avatar>
              <div className="mt-4 rounded-2xl border border-black/5 bg-white/50 px-4 py-3 text-left dark:border-white/15 dark:bg-white/5">
                <p className="text-sm font-semibold">{form.watch('username') || defaultValues.username || 'Your handle'}</p>
                <p className="text-xs text-slate-600 dark:text-white/65">{form.watch('email') || defaultValues.email || 'email@wordmates.app'}</p>
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-white/60">
                Tip: use a square image URL for the cleanest avatar.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
