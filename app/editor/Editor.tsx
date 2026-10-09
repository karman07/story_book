"use client";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, ChevronLeft, ChevronRight, Download, Eye, GripVertical,
  ImagePlus, Loader2, Plus, RefreshCw, Save, Sparkles, Trash2, Type,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "@/components/Canvas";
import { PageArt } from "@/components/PageArt";
import { newPage, renumber, uid } from "@/lib/elements";
import { compressImage } from "@/lib/image";
import { exportPdf } from "@/lib/pdf";
import { useBook } from "@/lib/useBook";
import type { PageElement } from "@/lib/types";

const COLORS = ["#242720", "#ffffff", "#315c46", "#8a3b12", "#1d3b6b"];
const lbl = "mb-1.5 block text-sm font-medium";

export function Editor() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const { book, loaded, saveError, update, patchPage, makeImage, makeElementImage, generateMissing } = useBook(id);
  const [sel, setSel] = useState(0);
  const [selEl, setSelEl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [sceneryOnly, setSceneryOnly] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const started = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (book && params.get("generate") === "1" && !started.current) {
      started.current = true;
      router.replace(`/editor?id=${book.id}`);
      generateMissing();
    }
  }, [book, params, router, generateMissing]);

  const pageIdx = book ? Math.min(sel, book.pages.length - 1) : 0;
  const page = book?.pages[pageIdx];
  const element = page?.elements.find((e) => e.id === selEl) ?? null;

  const setElements = (elements: PageElement[]) => {
    if (!page) return;
    const main = elements.find((e) => e.id === "main");
    patchPage(page.id, { elements, ...(main ? { text: main.text ?? "" } : {}) });
  };
  const patchEl = (patch: Partial<PageElement>) => element && setElements(page!.elements.map((e) => (e.id === element.id ? { ...e, ...patch } : e)));
  const removeEl = () => { if (element) { setElements(page!.elements.filter((e) => e.id !== element.id)); setSelEl(null); } };

  const removeRef = useRef(removeEl);
  removeRef.current = removeEl;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if ((e.key === "Delete" || e.key === "Backspace") && !/INPUT|TEXTAREA/.test(t.tagName)) removeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!loaded) return null;
  if (!book || !page) {
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <p className="mb-4">This book could not be found.</p>
        <Link href="/" className="btn btn-primary">Back to library</Link>
      </main>
    );
  }

  const busy = book.coverStatus === "loading" || book.pages.some((p) => p.imageStatus === "loading");
  const missing = book.coverStatus !== "done" || book.pages.some((p) => p.imageStatus !== "done" && (p.illustrationPrompt || p.sceneTitle));
  const say = (m: string) => { setFlash(m); setTimeout(() => setFlash(null), 2000); };
  const goto = (i: number) => { setSel(i); setSelEl(null); };

  const addText = () => {
    const el: PageElement = { id: uid(), kind: "text", x: 20, y: 20, w: 60, text: "New text", fontSize: 4, color: "#242720", align: "center", panel: true };
    setElements([...page.elements, el]);
    setSelEl(el.id);
  };
  const addImage = (src: string, blend = false) => {
    const el: PageElement = { id: uid(), kind: "image", x: 30, y: 15, w: 30, src, blend };
    setElements([...page.elements, el]);
    setSelEl(el.id);
  };
  const upload = async (f?: File) => {
    if (!f) return;
    const data = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); });
    addImage(await compressImage(data, 640));
  };
  const makeAi = async () => {
    setAiBusy(true); setAiError(null);
    try { addImage(await makeElementImage(aiPrompt.trim()), true); setAiPrompt(""); }
    catch (e) { setAiError(e instanceof Error ? e.message : "Generation failed."); }
    finally { setAiBusy(false); }
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    update((b) => {
      const pages = [...b.pages];
      pages.splice(to, 0, pages.splice(from, 1)[0]);
      return { ...b, pages: renumber(pages) };
    });
    goto(to);
  };
  const addPage = () => {
    update((b) => {
      const pages = [...b.pages];
      pages.splice(pageIdx + 1, 0, newPage());
      return { ...b, pages: renumber(pages) };
    });
    goto(pageIdx + 1);
  };
  const deletePage = () => {
    if (book.pages.length < 2 || !confirm("Delete this page?")) return;
    update((b) => ({ ...b, pages: renumber(b.pages.filter((p) => p.id !== page.id)) }));
    goto(Math.max(0, pageIdx - 1));
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-cream/95 px-4 py-3 backdrop-blur">
        <Link href="/" className="btn" aria-label="Back to library"><ArrowLeft className="h-4 w-4" /></Link>
        <input aria-label="Book title" className="field max-w-sm flex-1 font-serif text-lg font-semibold" value={book.title} onChange={(e) => update((b) => ({ ...b, title: e.target.value }))} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {flash && <span className="text-sm text-forest">{flash}</span>}
          {saveError && <span className="text-sm text-red-700">{saveError}</span>}
          {missing && !busy && <button className="btn" onClick={generateMissing}><RefreshCw className="h-4 w-4" /> Finish illustrations</button>}
          <button className="btn" onClick={() => say("Saved to this browser")}><Save className="h-4 w-4" /> Save</button>
          <button className="btn" disabled={exporting} onClick={async () => { setExporting(true); try { await exportPdf(book); } finally { setExporting(false); } }}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export PDF
          </button>
          <Link href={`/reader?id=${book.id}`} className="btn btn-primary"><Eye className="h-4 w-4" /> Preview</Link>
        </div>
      </header>

      <div className="grid flex-1 lg:grid-cols-[190px_1fr_340px]">
        <aside className="flex gap-2 overflow-x-auto border-b border-line p-3 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0">
          {book.pages.map((p, i) => (
            <div
              key={p.id}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
              onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
              onDrop={() => { if (dragFrom !== null) reorder(dragFrom, i); setDragFrom(null); setDragOver(null); }}
              className={`w-28 shrink-0 cursor-grab rounded-lg border-2 p-1 lg:w-full ${i === pageIdx ? "border-forest" : "border-transparent hover:border-line"} ${dragOver === i && dragFrom !== i ? "ring-2 ring-forest/40" : ""}`}
            >
              <button className="block w-full text-left" onClick={() => goto(i)} aria-label={`Page ${p.pageNumber}`}>
                <div className="pointer-events-none"><Canvas page={p} readOnly className="rounded-md" /></div>
                <div className="mt-1 flex items-center gap-1 truncate px-0.5 text-xs text-ink/70"><GripVertical className="h-3 w-3 shrink-0" />{p.pageNumber}. {p.sceneTitle}</div>
              </button>
            </div>
          ))}
          <button className="btn w-28 shrink-0 flex-col py-3 lg:w-full" onClick={addPage}><Plus className="h-4 w-4" /> Add page</button>
        </aside>

        <main className="flex flex-col items-center gap-4 p-4 sm:p-8">
          <div className="w-full max-w-3xl rounded-2xl border border-line bg-white p-3 shadow-sm">
            <Canvas page={page} selectedId={selEl} onSelect={setSelEl} onChange={setElements} onRetry={() => makeImage(page.id, { sceneryOnly })} />
          </div>
          <p className="text-xs text-ink/55">Drag text and images to move them. Select one and drag its green dot to resize.</p>
          <div className="flex items-center gap-3">
            <button className="btn" disabled={pageIdx === 0} onClick={() => goto(pageIdx - 1)}><ChevronLeft className="h-4 w-4" /> Previous</button>
            <span className="text-sm text-ink/60">Page {page.pageNumber} of {book.pages.length}</span>
            <button className="btn" disabled={pageIdx === book.pages.length - 1} onClick={() => goto(pageIdx + 1)}>Next <ChevronRight className="h-4 w-4" /></button>
          </div>
        </main>

        <aside className="space-y-6 border-t border-line bg-white p-4 lg:border-t-0 lg:border-l">
          <section>
            <h3 className="mb-3 font-serif text-lg font-semibold">Add to page</h3>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn" onClick={addText}><Type className="h-4 w-4" /> Text</button>
              <button className="btn" onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4" /> Upload image</button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            <div className="mt-2 flex gap-2">
              <input className="field" placeholder="AI image: e.g. a glowing lantern" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && aiPrompt.trim() && !aiBusy && makeAi()} />
              <button className="btn btn-primary" disabled={aiBusy || !aiPrompt.trim()} onClick={makeAi} aria-label="Generate AI image">
                {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </button>
            </div>
            {aiError && <p className="mt-1 text-xs text-red-700">{aiError}</p>}
          </section>

          {element ? (
            <section className="space-y-3 rounded-xl border border-forest/30 bg-cream/60 p-3">
              <h3 className="font-serif text-lg font-semibold">{element.kind === "text" ? "Text" : "Image"} settings</h3>
              {element.kind === "text" ? (
                <>
                  <textarea ref={textRef} aria-label="Text" className="field min-h-32 font-serif" value={element.text} onChange={(e) => patchEl({ text: e.target.value })} />
                  <div>
                    <label className={lbl} htmlFor="fs">Size</label>
                    <input id="fs" type="range" min={1.5} max={9} step={0.1} value={element.fontSize ?? 3.3} onChange={(e) => patchEl({ fontSize: +e.target.value })} className="w-full accent-[#315c46]" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLORS.map((c) => (
                      <button key={c} aria-label={`Color ${c}`} onClick={() => patchEl({ color: c })} className={`h-7 w-7 rounded-full border ${element.color === c ? "ring-2 ring-forest ring-offset-2" : "border-line"}`} style={{ background: c }} />
                    ))}
                    <input type="color" aria-label="Custom color" value={element.color ?? "#242720"} onChange={(e) => patchEl({ color: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-line bg-white" />
                  </div>
                  <div className="flex gap-1">
                    {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([a, Icon]) => (
                      <button key={a} aria-label={`Align ${a}`} className={`btn ${element.align === a ? "!border-forest !bg-forest !text-white" : ""}`} onClick={() => patchEl({ align: a })}><Icon className="h-4 w-4" /></button>
                    ))}
                    <button aria-label="Bold" className={`btn ${element.bold ? "!border-forest !bg-forest !text-white" : ""}`} onClick={() => patchEl({ bold: !element.bold })}><Bold className="h-4 w-4" /></button>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!element.panel} onChange={(e) => patchEl({ panel: e.target.checked })} className="accent-[#315c46]" /> Cream panel behind text</label>
                </>
              ) : (
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!element.blend} onChange={(e) => patchEl({ blend: e.target.checked })} className="accent-[#315c46]" /> Blend away white background</label>
              )}
              <button className="btn w-full text-red-800" onClick={removeEl}><Trash2 className="h-4 w-4" /> Delete element</button>
            </section>
          ) : (
            <p className="rounded-xl bg-cream/70 p-3 text-sm text-ink/60">Click text or an image on the page to edit it.{" "}
              <button className="underline" onClick={() => { const m = page.elements.find((e) => e.kind === "text"); if (m) setSelEl(m.id); }}>Edit page text</button>
            </p>
          )}

          <section className="space-y-3">
            <h3 className="font-serif text-lg font-semibold">Page illustration</h3>
            <div>
              <label className={lbl} htmlFor="scene">Scene title</label>
              <input id="scene" className="field" value={page.sceneTitle} onChange={(e) => patchPage(page.id, { sceneTitle: e.target.value })} />
            </div>
            <div>
              <label className={lbl} htmlFor="prompt">Illustration prompt</label>
              <textarea id="prompt" className="field min-h-24 text-sm" value={page.illustrationPrompt} onChange={(e) => patchPage(page.id, { illustrationPrompt: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sceneryOnly} onChange={(e) => setSceneryOnly(e.target.checked)} className="accent-[#315c46]" /> Background scenery only (no characters)</label>
            <button className="btn btn-primary w-full" disabled={page.imageStatus === "loading"} onClick={() => makeImage(page.id, { sceneryOnly })}>
              {page.imageStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {page.imageStatus === "error" ? "Retry illustration" : page.image ? "Regenerate illustration" : "Generate illustration"}
            </button>
            <p className="text-xs text-ink/55">Only the picture is repainted. Your text and layout stay put.</p>
            <button className="btn w-full text-red-800" disabled={book.pages.length < 2} onClick={deletePage}><Trash2 className="h-4 w-4" /> Delete page</button>
          </section>

          <section className="border-t border-line pt-4">
            <h3 className="mb-2 font-serif text-lg font-semibold">Cover</h3>
            <PageArt src={book.cover} status={book.coverStatus} alt="Cover" onRetry={() => makeImage("cover")} />
            {book.cover && (
              <button className="btn mt-2 w-full" disabled={book.coverStatus === "loading"} onClick={() => makeImage("cover")}><RefreshCw className="h-4 w-4" /> Regenerate cover</button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
