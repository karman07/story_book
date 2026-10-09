"use client";
import { BookOpen, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteBook, listBooks } from "@/lib/storage";
import type { Book } from "@/lib/types";

export default function Library() {
  const [books, setBooks] = useState<Book[] | null>(null);
  useEffect(() => setBooks(listBooks()), []);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-forest">
        <BookOpen className="h-4 w-4" /> Storybook Maker
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">Your storybooks</h1>
          <p className="mt-2 text-ink/70">Create as many illustrated books as you like, then arrange every page your way.</p>
        </div>
        <Link href="/new" className="btn btn-primary px-5 py-3 text-base"><Plus className="h-5 w-5" /> New storybook</Link>
      </div>

      {books && books.length === 0 && (
        <div className="mt-12 rounded-2xl border border-dashed border-line bg-white/60 p-12 text-center">
          <p className="font-serif text-xl">No books yet.</p>
          <p className="mt-1 text-ink/60">Describe an idea and Gemini will write and illustrate it.</p>
          <Link href="/new" className="btn btn-primary mt-5">Create your first storybook</Link>
        </div>
      )}

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {books?.map((b) => {
          const art = b.cover ?? b.pages.find((p) => p.image)?.image;
          return (
            <li key={b.id} className="fade-in overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              <Link href={`/editor?id=${b.id}`} className="block aspect-[4/3] bg-[#efe9da]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {art ? <img src={art} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-ink/50">No illustration yet</div>}
              </Link>
              <div className="p-4">
                <h2 className="truncate font-serif text-lg font-semibold">{b.title}</h2>
                <p className="text-xs text-ink/60">{b.pages.length} pages · {b.style} · ages {b.ageGroup}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/editor?id=${b.id}`} className="btn flex-1"><Pencil className="h-4 w-4" /> Edit</Link>
                  <Link href={`/reader?id=${b.id}`} className="btn flex-1"><Eye className="h-4 w-4" /> Read</Link>
                  <button
                    className="btn"
                    aria-label={`Delete ${b.title}`}
                    onClick={() => {
                      if (confirm(`Delete "${b.title}"? This cannot be undone.`)) {
                        deleteBook(b.id);
                        setBooks(listBooks());
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
