import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Play } from "lucide-react";
import { getMovies, incrementPlayCount, Movie } from "@/lib/cms-storage";
import { slugify } from "@/lib/slug";
import { resolveMediaUrl } from "@/lib/media-source";
import PlayerModal from "@/components/PlayerModal";

export default function Watch() {
  const { slug } = useParams<{ slug: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [playing, setPlaying] = useState(false);
  const counted = useRef(false);

  useEffect(() => {
    const all = getMovies().filter((m) => m.published);
    // Prefer the persisted slug; fall back to legacy title-slug or id for old links.
    const found =
      all.find((m) => m.slug === slug) ||
      all.find((m) => !m.slug && slugify(m.title) === slug) ||
      all.find((m) => m.id === slug) ||
      null;
    setMovie(found);
    document.title = found ? `${found.title} — Watch` : "Watch";
  }, [slug]);

  const videoSrc = useMemo(() => resolveMediaUrl(movie?.video), [movie]);
  const posterSrc = useMemo(() => resolveMediaUrl(movie?.poster), [movie]);
  const backdropSrc = useMemo(() => resolveMediaUrl(movie?.backdrop), [movie]);

  if (!movie) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Movie not found</h1>
          <Link to="/" className="text-primary-glow underline">Back to home</Link>
        </div>
      </main>
    );
  }

  const handlePlay = () => {
    if (!counted.current) {
      counted.current = true;
      incrementPlayCount(movie.id);
    }
    setPlaying(true);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative">
        {backdropSrc && (
          <div className="absolute inset-0 -z-0">
            <img src={backdropSrc} alt="" className="w-full h-[60vh] object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          </div>
        )}

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-4 pb-16 grid md:grid-cols-[260px_1fr] gap-8">
          {posterSrc && (
            <img src={posterSrc} alt={movie.title} className="w-full rounded-2xl shadow-elegant" />
          )}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">{movie.title}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {movie.year ? <span>{movie.year}</span> : null}
              {movie.duration ? <span>{movie.duration} min</span> : null}
              {movie.rating ? <span>★ {movie.rating}</span> : null}
            </div>
            {movie.description && <p className="text-base text-foreground/85 max-w-2xl">{movie.description}</p>}

            <div className="pt-4 rounded-2xl overflow-hidden bg-black aspect-video relative">
              <button
                  onClick={handlePlay}
                  disabled={!videoSrc}
                  className="absolute inset-0 flex items-center justify-center group"
                  style={backdropSrc ? { backgroundImage: `url(${backdropSrc})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
                >
                  <span className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors" />
                  <span className="relative flex items-center gap-3 px-6 py-3 rounded-full gradient-brand text-primary-foreground font-semibold shadow-glow">
                    <Play className="w-5 h-5 fill-current" /> {videoSrc ? "Play" : "No video"}
                  </span>
                </button>
            </div>
          </div>
        </div>
      </div>

      {playing && <PlayerModal movie={movie} onClose={() => setPlaying(false)} />}
    </main>
  );
}
