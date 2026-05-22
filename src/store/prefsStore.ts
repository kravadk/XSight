import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Local, device-scoped preferences for X Cup — onboarding progress and the
 * settings the user controls from the gear menu. Persisted to localStorage so a
 * returning visitor keeps their choices; nothing here ever leaves the browser.
 */
interface PrefsState {
  /** True once the welcome walkthrough has been completed or skipped. */
  seenOnboarding: boolean;
  /** Damp animations app-wide (accessibility — feeds into MotionConfig). */
  reducedMotion: boolean;
  /** Show event notifications (market resolved, oracle activity) in the bell. */
  notifyEvents: boolean;

  setSeenOnboarding: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setNotifyEvents: (v: boolean) => void;
  /** Wipe every X Cup key from localStorage and reload to a clean state. */
  clearLocalData: () => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      seenOnboarding: false,
      reducedMotion: false,
      notifyEvents: true,

      setSeenOnboarding: (v) => set({ seenOnboarding: v }),
      setReducedMotion: (v) => set({ reducedMotion: v }),
      setNotifyEvents: (v) => set({ notifyEvents: v }),
      clearLocalData: () => {
        try {
          localStorage.clear();
        } finally {
          window.location.reload();
        }
      },
    }),
    { name: 'xcup-prefs' },
  ),
);
