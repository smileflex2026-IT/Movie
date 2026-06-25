import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function detect(): Theme {
  if (typeof document === "undefined") return "dark";
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(detect);

  useEffect(() => {
    const update = () => setTheme(detect());

    // Watch <html> class changes (manual theme toggles)
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Watch system preference
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    mq?.addEventListener?.("change", update);

    return () => {
      observer.disconnect();
      mq?.removeEventListener?.("change", update);
    };
  }, []);

  return theme;
}
