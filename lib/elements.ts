import type { Book, PageElement, StoryPage } from "./types";

export const uid = () => crypto.randomUUID();

export function defaultTextElement(text: string): PageElement {
  const fontSize = text.length > 260 ? 2.8 : 3.3;
  const charsPerLine = 84 / (fontSize * 0.5);
  const height = Math.ceil(text.length / charsPerLine) * fontSize * 1.4 + 3.2;
  return {
    id: "main",
    kind: "text",
    x: 6,
    y: Math.max(4, 96 - height),
    w: 88,
    text,
    fontSize,
    color: "#242720",
    align: "center",
    panel: true,
  };
}

/** Fill in fields older saved books don't have. */
export function normalizeBook(b: Book): Book {
  return {
    ...b,
    pages: b.pages.map((p) => ({
      ...p,
      id: p.id ?? uid(),
      elements: p.elements ?? [defaultTextElement(p.text)],
    })),
  };
}

export function newPage(): StoryPage {
  return {
    id: uid(),
    elements: [defaultTextElement("Your story continues…")],
    pageNumber: 0,
    sceneTitle: "New page",
    text: "Your story continues…",
    illustrationPrompt: "",
    characters: [],
    imageStatus: "idle",
  };
}

export const renumber = (pages: StoryPage[]) => pages.map((p, i) => ({ ...p, pageNumber: i + 1 }));
