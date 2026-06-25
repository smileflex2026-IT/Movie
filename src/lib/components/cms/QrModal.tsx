import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Modal from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export default function QrModal({ open, onClose, title, url }: Props) {
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };
  const download = () => {
    const svg = document.getElementById("qr-svg") as unknown as SVGSVGElement | null;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title || "movie"}-qr.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Modal open={open} onClose={onClose} title={`QR Code — ${title}`} maxWidth="max-w-md">
      <div className="flex flex-col items-center gap-5">
        <div className="bg-white p-4 rounded-2xl">
          <QRCodeSVG id="qr-svg" value={url} size={224} level="M" includeMargin={false} />
        </div>
        <div className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs break-all text-muted-foreground">
          {url}
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={copy} className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/70 text-sm font-medium flex items-center gap-2"><Copy className="w-4 h-4" /> Copy link</button>
          <button onClick={download} className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/70 text-sm font-medium flex items-center gap-2"><Download className="w-4 h-4" /> Download SVG</button>
          <a href={url} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg gradient-brand text-primary-foreground text-sm font-semibold flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Open</a>
        </div>
      </div>
    </Modal>
  );
}
