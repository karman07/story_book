"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { generateImage } from "./gemini";
import { compressImage } from "./image";
import { loadBook, saveBook } from "./storage";
import type { Book, StoryPage } from "./types";

export function useBook(id: string | null) {
  const [book, setBook] = useState<Book | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const bookRef = useRef<Book | null>(null);
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    const b = id ? loadBook(id) : null;
    if (b) {
      // Interrupted generations from a previous session become retryable.
      b.pages = b.pages.map((p) => (p.imageStatus === "loading" ? { ...p, imageStatus: "idle" } : p));
      if (b.coverStatus === "loading") b.coverStatus = "idle";
    }
    bookRef.current = b;
    setBook(b);
    setLoaded(true);
  }, [id]);

  const update = useCallback((fn: (b: Book) => Book) => {
    if (!bookRef.current) return;
    const next = fn(bookRef.current);
    bookRef.current = next;
    setBook(next);
    setSaveError(saveBook(next));
  }, []);

  const patchPage = useCallback(
    (pageId: string, patch: Partial<StoryPage>) =>
      update((b) => ({ ...b, pages: b.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p)) })),
    [update],
  );

  /** target is a page id or "cover". */
  const makeImage = useCallback(
    async (target: string, opts: { sceneryOnly?: boolean } = {}) => {
      const b = bookRef.current;
      if (!b || inFlight.current.has(target)) return;
      const index = target === "cover" ? -1 : b.pages.findIndex((p) => p.id === target);
      if (target !== "cover" && index < 0) return;
      inFlight.current.add(target);
      const set = (patch: Partial<StoryPage> & { cover?: string; coverStatus?: Book["coverStatus"] }) =>
        target === "cover"
          ? update((x) => ({ ...x, cover: patch.cover ?? x.cover, coverStatus: patch.coverStatus ?? x.coverStatus }))
          : patchPage(target, patch);
      set(target === "cover" ? { coverStatus: "loading" } : { imageStatus: "loading", imageError: undefined });
      try {
        const page = b.pages[index];
        // Reference: previous page's art (else cover) keeps characters consistent.
        const ref = opts.sceneryOnly || !page ? undefined : (index > 0 ? b.pages[index - 1].image : undefined) ?? b.cover ?? b.pages.find((p) => p.image)?.image;
        const scene = !page ? `Cover: ${b.synopsis}` : page.illustrationPrompt || page.sceneTitle;
        const raw = await generateImage(b, scene, page ? page.characters : b.characters.map((c) => c.name), ref, page ? "page" : "cover", opts.sceneryOnly);
        const image = await compressImage(raw);
        set(page ? { image, imageStatus: "done" } : { cover: image, coverStatus: "done" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Image generation failed.";
        set(target === "cover" ? { coverStatus: "error" } : { imageStatus: "error", imageError: msg });
      } finally {
        inFlight.current.delete(target);
      }
    },
    [update, patchPage],
  );

  /** Generate an image for a draggable element (no page state touched). */
  const makeElementImage = useCallback(async (prompt: string) => {
    const b = bookRef.current;
    if (!b) throw new Error("No book loaded.");
    return compressImage(await generateImage(b, prompt, [], undefined, "element"), 640);
  }, []);

  /** Generate every missing illustration in order (cover first, then pages). */
  const generateMissing = useCallback(async () => {
    if (!bookRef.current || inFlight.current.has("all")) return;
    inFlight.current.add("all");
    try {
      if (!bookRef.current.cover) await makeImage("cover");
      for (const { id: pid } of bookRef.current.pages) {
        const p = bookRef.current.pages.find((x) => x.id === pid);
        if (p && !p.image && p.imageStatus !== "error" && (p.illustrationPrompt || p.sceneTitle)) await makeImage(pid);
      }
    } finally {
      inFlight.current.delete("all");
    }
  }, [makeImage]);

  return { book, loaded, saveError, update, patchPage, makeImage, makeElementImage, generateMissing };
}
