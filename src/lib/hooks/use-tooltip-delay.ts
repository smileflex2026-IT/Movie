import { useEffect, useState, useCallback } from "react";

export type TooltipSpeed = "instant" | "fast" | "normal" | "slow" | "off";

const KEY = "cms.tooltipSpeed";

export const SPEED_DELAYS: Record<TooltipSpeed, number> = {
  instant: 0,
  fast: 150,
  normal: 400,
  slow: 800,
  off: 99999,
};

export const SPEED_LABELS: Record<TooltipSpeed, string> = {
  instant: "Instant",
  fast: "Fast",
  normal: "Normal",
  slow: "Slow",
  off: "Off",
};

function read(): TooltipSpeed {
  if (typeof window === "undefined") return "fast";
  const v = window.localStorage.getItem(KEY) as TooltipSpeed | null;
  return v && v in SPEED_DELAYS ? v : "fast";
}

const EVT = "tooltip-speed-change";

export function useTooltipDelay() {
  const [speed, setSpeedState] = useState<TooltipSpeed>(read);

  useEffect(() => {
    const onChange = () => setSpeedState(read());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setSpeed = useCallback((s: TooltipSpeed) => {
    window.localStorage.setItem(KEY, s);
    window.dispatchEvent(new Event(EVT));
  }, []);

  return { speed, setSpeed, delay: SPEED_DELAYS[speed] };
}
