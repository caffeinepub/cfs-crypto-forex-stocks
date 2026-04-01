import { Download, Smartphone, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "cfs_pwa_banner_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    if (deferredPrompt) {
      setCanInstall(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      deferredPrompt = null;
      setCanInstall(false);
      setIsInstalled(true);
      return true;
    }
    return false;
  };

  return { canInstall, isInstalled, triggerInstall };
}

export default function PWAInstallBanner() {
  const { canInstall, triggerInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (canInstall && !dismissed) {
      // Small delay for better UX
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, [canInstall, dismissed]);

  function handleDismiss() {
    setVisible(false);
    setTimeout(() => {
      setDismissed(true);
      localStorage.setItem(DISMISSED_KEY, "true");
    }, 300);
  }

  async function handleInstall() {
    const accepted = await triggerInstall();
    if (accepted) {
      setVisible(false);
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa-banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-safe md:bottom-6"
          data-ocid="pwa.toast"
        >
          <div className="max-w-lg mx-auto bg-card border border-gain/30 rounded-2xl shadow-2xl shadow-black/40 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gain/10 border border-gain/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-gain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">
                Install CFS App
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                Add to Home Screen for a native app experience
              </p>
            </div>
            <button
              type="button"
              onClick={handleInstall}
              data-ocid="pwa.primary_button"
              className="shrink-0 flex items-center gap-1.5 bg-gain text-black font-semibold text-xs px-3 py-2 rounded-lg hover:bg-gain/90 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              data-ocid="pwa.close_button"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
