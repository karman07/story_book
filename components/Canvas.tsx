"use client";
import { useRef, useState } from "react";
import { PageArt } from "./PageArt";
import type { PageElement, StoryPage } from "@/lib/types";

interface Props {
  page: StoryPage;
  readOnly?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (elements: PageElement[]) => void;
  onRetry?: () => void;
  className?: string;
}

type Drag = { id: string; x: number; y: number; w: number };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A 4:3 page: AI illustration as the background, with draggable text and image elements on top. */
export function Canvas({ page, readOnly, selectedId, onSelect, onChange, onRetry, className = "" }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const start = useRef<{ mode: "move" | "resize"; el: PageElement; px: number; py: number } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const begin = (e: React.PointerEvent, el: PageElement, mode: "move" | "resize") => {
    if (readOnly) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect?.(el.id);
    start.current = { mode, el, px: e.clientX, py: e.clientY };
    setDrag({ id: el.id, x: el.x, y: el.y, w: el.w });
  };

  const move = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || !root.current) return;
    const r = root.current.getBoundingClientRect();
    const dx = ((e.clientX - s.px) / r.width) * 100;
    const dy = ((e.clientY - s.py) / r.height) * 100;
    setDrag(
      s.mode === "move"
        ? { id: s.el.id, x: clamp(s.el.x + dx, -s.el.w + 8, 92), y: clamp(s.el.y + dy, -5, 95), w: s.el.w }
        : { id: s.el.id, x: s.el.x, y: s.el.y, w: clamp(s.el.w + dx, 8, 100 - s.el.x) },
    );
  };

  const end = () => {
    const s = start.current;
    start.current = null;
    if (s && drag) onChange?.(page.elements.map((el) => (el.id === s.el.id ? { ...el, x: drag.x, y: drag.y, w: drag.w } : el)));
    setDrag(null);
  };

  return (
    <div
      ref={root}
      className={`relative w-full select-none overflow-hidden rounded-xl ${className}`}
      style={{ containerType: "inline-size" }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerDown={() => onSelect?.(null)}
    >
      <PageArt src={page.image} status={page.imageStatus} error={page.imageError} alt={page.sceneTitle} onRetry={readOnly ? undefined : onRetry} className="rounded-none" />
      {page.elements.map((el) => {
        const g = drag?.id === el.id ? { ...el, ...drag } : el;
        const selected = !readOnly && selectedId === el.id;
        if (readOnly && el.kind === "text" && !el.text) return null;
        return (
          <div
            key={el.id}
            onPointerDown={(e) => begin(e, el, "move")}
            className={`absolute ${readOnly ? "" : "cursor-move"} ${selected ? "outline-2 outline-offset-2 outline-forest" : !readOnly ? "hover:outline-1 hover:outline-forest/50" : ""}`}
            style={{ left: `${g.x}%`, top: `${g.y}%`, width: `${g.w}%`, touchAction: readOnly ? undefined : "none" }}
          >
            {el.kind === "text" ? (
              <div
                className="font-serif break-words whitespace-pre-wrap"
                style={{
                  fontSize: `${el.fontSize ?? 3.3}cqw`,
                  color: el.color,
                  textAlign: el.align,
                  fontWeight: el.bold ? 700 : 400,
                  lineHeight: 1.4,
                  padding: "1.2cqw 1.8cqw",
                  borderRadius: "1.2cqw",
                  background: el.panel ? "rgba(250,247,240,.9)" : "transparent",
                  textShadow: el.panel ? undefined : "0 0 .6cqw rgba(0,0,0,.35)",
                  minHeight: "1.4em",
                }}
              >
                {el.text || (readOnly ? "" : "Empty text")}
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={el.src} alt="" draggable={false} className="pointer-events-none block h-auto w-full" style={{ mixBlendMode: el.blend ? "multiply" : "normal" }} />
            )}
            {selected && (
              <span
                onPointerDown={(e) => begin(e, el, "resize")}
                className="absolute -right-2.5 -bottom-2.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-forest shadow"
                style={{ touchAction: "none" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
