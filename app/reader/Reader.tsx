"use client";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Canvas } from "@/components/Canvas";
import { PageArt } from "@/components/PageArt";
import { useBook } from "@/lib/useBook";

export function Reader() {
  const id = useSearchParams().get("id");
  const { book, loaded } = useBook(id);
  const [i, setI] = useState(-1); // -1 = cover

  const last = (book?.pages.length ?? 1) - 1;
  const go = useCallback((d: number) => setI((v) => Math.max(-1, Math.min(last, v + d))), [last]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!loaded) return null;
  if (!book) {
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <p className="mb-4">This book could not be found.</p>
        <Link href="/" className="btn btn-primary">Back to library</Link>
      </main>
    );
  }

  const page = i >= 0 ? book.pages[i] : null;
  const progress = ((i + 1) / (book.pages.length + 1)) * 100;
  const coverArt = book.cover ?? book.pages.find((p) => p.image)?.image;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-1 bg-line" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-forest transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <header className="flex items-center justify-between px-4 py-3">
        <Link href={`/editor?id=${book.id}`} className="btn"><ArrowLeft className="h-4 w-4" /> Return to Editor</Link>
        {page && <button className="btn" onClick={() => setI(-1)}><RotateCcw className="h-4 w-4" /> Restart Story</button>}
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-6">
        {!page ? (
          <div key="cover" className="fade-in flex w-full max-w-xl flex-col items-center gap-6 text-center">
            <PageArt src={coverArt} status={coverArt ? "done" : "idle"} alt="Cover" className="shadow-xl" />
            <h1 className="font-serif text-4xl font-semibold sm:text-5xl">{book.title}</h1>
            <p className="max-w-md text-ink/70">{book.synopsis}</p>
            <button className="btn btn-primary px-8 py-3 text-base" onClick={() => setI(0)}>Start Reading</button>
          </div>
        ) : (
          <div key={page.id} className="fade-in w-full max-w-4xl">
            <Canvas page={page} readOnly className="shadow-xl" />
          </div>
        )}
      </main>

      {page && (
        <footer className="flex items-center justify-center gap-4 pb-8">
          <button className="btn" onClick={() => go(-1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /> Previous</button>
          <span className="text-sm text-ink/60">{i === last ? "The End · " : ""}Page {page.pageNumber} of {book.pages.length}</span>
          <button className="btn btn-primary" disabled={i === last} onClick={() => go(1)} aria-label="Next page">Next <ChevronRight className="h-4 w-4" /></button>
        </footer>
      )}
    </div>
  );
}
