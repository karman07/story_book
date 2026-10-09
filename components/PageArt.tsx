import { AlertTriangle, ImageIcon, Loader2, RotateCw } from "lucide-react";
import type { ImageStatus } from "@/lib/types";

interface Props {
  src?: string;
  status: ImageStatus;
  error?: string;
  alt: string;
  onRetry?: () => void;
  className?: string;
}

export function PageArt({ src, status, error, alt, onRetry, className = "" }: Props) {
  return (
    <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#efe9da] ${className}`}>
      {src && status !== "loading" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="fade-in h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-ink/60">
          {status === "loading" ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-forest" />
              Painting illustration…
            </>
          ) : status === "error" ? (
            <>
              <AlertTriangle className="h-6 w-6 text-amber-700" />
              <span className="max-w-xs">{error ?? "Illustration failed."}</span>
              {onRetry && (
                <button className="btn mt-1" onClick={onRetry}>
                  <RotateCw className="h-4 w-4" /> Retry
                </button>
              )}
            </>
          ) : (
            <>
              <ImageIcon className="h-6 w-6" />
              Waiting to be illustrated
              {onRetry && (
                <button className="btn mt-1" onClick={onRetry}>
                  Generate
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
