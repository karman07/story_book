import { normalizeBook } from "./elements";
import type { Book } from "./types";

const KEY = "storybook.books.v1";

function readAll(): Record<string, Book> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function loadBook(id: string): Book | null {
  const b = readAll()[id];
  return b ? normalizeBook(b) : null;
}

export function listBooks(): Book[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveBook(book: Book): string | null {
  const all = readAll();
  all[book.id] = { ...book, updatedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return null;
  } catch {
    return "Browser storage is full. Delete older books to save this one.";
  }
}

export function deleteBook(id: string) {
  const all = readAll();
  delete all[id];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}
