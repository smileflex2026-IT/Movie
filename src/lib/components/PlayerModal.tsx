import { useEffect, useRef, useState } from "react";
import { X, Star } from "lucide-react";
import { Ad, Movie } from "@/lib/cms-storage";
import { resolveMediaUrl } from "@/lib/media-source";

/**
 * Shared movie player with full ad rotation (pre-roll, mid-roll, end-roll).
 *
 * All media sources — the main video and every ad URL — are passed through
 * `resolveMediaUrl` so the CMS can store either a fully-qualified cloud URL
 * or a bare local filename (e.g. `oppenheimer.mp4` → `/media/oppenheimer.mp4`).
 * This keeps the CMS input and the front-end viewer in sync regardless of
 * whether content lives in Lovable Cloud storage or on the local drive.
 */
export default function PlayerModal({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"preroll" | "main" | "midroll" | "endroll">(
    movie.ads.some((a) => a.type === "preroll") ? "preroll" : "main",
  );
  const [currentAd, setCurrentAd] = useState<Ad | null>(
    movie.ads.find((a) => a.type === "preroll") || null,
  );
  const [skipIn, setSkipIn] = useState(currentAd?.skipAfter ?? 0);
  const [playedMidroll, setPlayedMidroll] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!currentAd) return;
    setSkipIn(currentAd.skipAfter);
    const t = setInterval(() => setSkipIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [currentAd]);

  const goToMain = () => {
    setCurrentAd(null);
    setPhase("main");
  };

  const onTimeUpdate = () => {
    if (phase !== "main" || !videoRef.current) return;
    const t = Math.floor(videoRef.current.currentTime);
    const mid = movie.ads.find(
      (a) => a.type === "midroll" && a.timestamp === t && !playedMidroll.has(t),
    );
    if (mid) {
      videoRef.current.pause();
      setPlayedMidroll((p) => new Set(p).add(t));
      setCurrentAd(mid);
      setPhase("midroll");
    }
  };

  const skipAd = () => {
    if (skipIn > 0) return;
    if (phase === "preroll") goToMain();
    else if (phase === "endroll") {
      setCurrentAd(null);
      onClose();
    } else {
      setCurrentAd(null);
      setPhase("main");
      setTimeout(() => videoRef.current?.play(), 50);
    }
  };

  const onAdEnded = () => skipAd();

  const mainSrc = resolveMediaUrl(movie.video);
  const adSrc = currentAd ? resolveMediaUrl(currentAd.url) : "";

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-[#141414] rounded-xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/70 hover:bg-black flex items-center justify-center"
          aria-label="Close player"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="relative bg-black aspect-video">
          {currentAd ? (
            <>
              <video
                key={adSrc}
                src={adSrc}
                autoPlay
                controls={false}
                className="w-full h-full"
                onEnded={onAdEnded}
              />
              <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded uppercase tracking-wider">
                Advertisement
              </div>
              <button
                onClick={skipAd}
                disabled={skipIn > 0}
                className="absolute bottom-4 right-4 bg-black/70 hover:bg-black text-white text-sm px-4 py-2 rounded disabled:opacity-60"
              >
                {skipIn > 0 ? `Skip in ${skipIn}s` : "Skip Ad ▶"}
              </button>
            </>
          ) : (
            <video
              ref={videoRef}
              key={mainSrc}
              src={mainSrc}
              autoPlay
              controls
              className="w-full h-full"
              onTimeUpdate={onTimeUpdate}
              onEnded={() => {
                const end = movie.ads.find((a) => a.type === "endroll");
                if (end) {
                  setCurrentAd(end);
                  setPhase("endroll");
                }
              }}
            />
          )}
        </div>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-2">{movie.title}</h2>
          <div className="flex items-center gap-3 text-sm text-white/70 mb-3">
            {movie.year && <span>{movie.year}</span>}
            {movie.duration ? <span>{movie.duration} min</span> : null}
            {movie.rating ? (
              <span className="flex items-center gap-1 text-[#FFD700]">
                <Star className="w-3.5 h-3.5 fill-[#FFD700]" />
                {movie.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          <p className="text-white/80 text-sm leading-relaxed">{movie.description}</p>
        </div>
      </div>
    </div>
  );
}