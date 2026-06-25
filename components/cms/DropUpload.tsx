import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inputCls } from "./FormField";
import { toast } from "sonner";

type Kind = "image" | "video";

interface DropUploadProps {
  /** Storage bucket name — must already exist and be public. */
  bucket: "posters" | "backdrops" | "videos";
  /** Current saved URL value (shown as preview + kept in sync). */
  value: string;
  onChange: (url: string) => void;
  kind: Kind;
  /** Optional sub-folder inside the bucket (e.g. movie slug). */
  folder?: string;
  /** Aspect ratio for the preview tile. */
  aspect?: "video" | "poster" | "wide";
  className?: string;
  /**
   * Upload destination:
   *  - "cloud" (default): pushes the file to the Lovable Cloud storage bucket.
   *  - "local": no upload — the dropped file's name is stored as the value so
   *    the player resolves it against the local media base (e.g. `/media/foo.mp4`).
   *    Ideal for offline / local-drive hosting where the actual file is copied
   *    into `public/media/` (or served from a LAN address) by the operator.
   */
  mode?: "cloud" | "local";
}

const ACCEPT: Record<Kind, string> = {
  image: "image/*",
  video: "video/*",
};

const safeName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

export default function DropUpload({
  bucket,
  value,
  onChange,
  kind,
  folder,
  aspect = "video",
  className = "",
  mode = "cloud",
}: DropUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      if (!file) return;
      // Basic validation
      if (kind === "image" && !file.type.startsWith("image/")) {
        toast.error("Please drop an image file");
        return;
      }
      if (kind === "video" && !file.type.startsWith("video/")) {
        toast.error("Please drop a video file");
        return;
      }

      // ── LOCAL MODE ───────────────────────────────────────────────────────
      // Just register the filename. The player resolves it via media-source.ts
      // against the configured local media base (default `/media/`). No
      // network calls, no bucket limits, no auth required.
      if (mode === "local") {
        const name = safeName(file.name);
        const folderPart = folder ? `${safeName(folder)}/` : "";
        onChange(`${folderPart}${name}`);
        toast.success(
          `Linked ${name}. Copy the file into public/media/${folderPart} (or your configured base) so it can be played.`,
          { duration: 7000 },
        );
        return;
      }

      const max = kind === "video" ? 2_000 : 25; // soft MB limits for UX warning
      if (file.size > max * 1024 * 1024) {
        toast.warning(`Large file (${(file.size / 1024 / 1024).toFixed(1)} MB) — upload may take a while`);
      }

      const stamp = Date.now().toString(36);
      const path = `${folder ? `${safeName(folder)}/` : ""}${stamp}-${safeName(file.name)}`;

      setUploading(true);
      setProgress(0);
      try {
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
        });
        if (error) {
          // Surface the real reason instead of a silent fail.
          // eslint-disable-next-line no-console
          console.error("[DropUpload] upload failed", { bucket, path, error });
          const status = (error as { statusCode?: string | number }).statusCode;
          const hint =
            status === "413" || /exceeded the maximum allowed size/i.test(error.message)
              ? " — file is larger than the bucket's size limit. Raise it in Cloud → Storage → Buckets."
              : status === "403" || /row-level security|permission/i.test(error.message)
              ? " — storage permissions blocked the upload. Make sure anon uploads are allowed on this bucket."
              : "";
          throw new Error(`${error.message}${hint}`);
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        onChange(data.publicUrl);
        setProgress(100);
        toast.success(`Uploaded to ${bucket}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        toast.error(msg, { duration: 7000 });
      } finally {
        setUploading(false);
        setTimeout(() => setProgress(null), 600);
      }
    },
    [bucket, folder, kind, mode, onChange],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  const aspectCls =
    aspect === "poster" ? "aspect-[2/3]" : aspect === "wide" ? "aspect-[21/9]" : "aspect-video";

  const Icon = kind === "video" ? Film : ImageIcon;

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`relative ${aspectCls} w-full rounded-xl border-2 border-dashed bg-input/40 overflow-hidden cursor-pointer transition-all ${
          dragOver
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-border hover:border-primary/60 hover:bg-input/70"
        }`}
      >
        {value ? (
          kind === "image" ? (
            <img src={value} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <video src={value} className="absolute inset-0 w-full h-full object-cover" muted />
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground p-4 text-center">
            <Icon className="w-10 h-10 opacity-60" />
            <p className="text-sm font-medium text-foreground">
              Drop a {kind === "video" ? "video" : "image"} here
            </p>
            <p className="text-xs">
              or click to browse —{" "}
              {mode === "local" ? (
                <>links to local <code className="px-1 rounded bg-secondary">/media/</code></>
              ) : (
                <>uploads to <code className="px-1 rounded bg-secondary">{bucket}</code></>
              )}
            </p>
          </div>
        )}

        {(dragOver || uploading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-sm">
                <Loader2 className="w-6 h-6 animate-spin text-primary-glow" />
                <span>Uploading{progress != null ? ` ${progress}%` : "…"}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium text-primary-glow">
                <Upload className="w-5 h-5" /> Release to upload
              </div>
            )}
          </div>
        )}

        {value && !uploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            aria-label="Clear"
            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste a URL"
          className={`${inputCls} text-xs`}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-xs flex items-center gap-1.5 whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5" /> Upload
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}