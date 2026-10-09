import { GoogleGenAI, Type } from "@google/genai";
import { defaultTextElement } from "./elements";
import type { Book, Character, StoryPage, StoryRequest } from "./types";

const TEXT_MODEL = "gemini-3.8-flash";
const IMAGE_MODEL = "gemini-nano-banana-2.1";

let client: GoogleGenAI | null = null;
function ai() {
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing API key. Set VITE_GEMINI_API_KEY in .env.local and restart the dev server.");
  }
  return (client ??= new GoogleGenAI({ apiKey }));
}

function friendlyError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  if (/API key|API_KEY|401|403/i.test(msg)) return new Error("Gemini rejected the API key. Check VITE_GEMINI_API_KEY.");
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) return new Error("Gemini rate limit or quota reached. Wait a moment and retry.");
  return e instanceof Error ? e : new Error(msg);
}

const storySchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    synopsis: { type: Type.STRING },
    characters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
        required: ["name", "description"],
      },
    },
    pages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pageNumber: { type: Type.INTEGER },
          sceneTitle: { type: Type.STRING },
          text: { type: Type.STRING },
          illustrationPrompt: { type: Type.STRING },
          characters: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["pageNumber", "sceneTitle", "text", "illustrationPrompt", "characters"],
      },
    },
  },
  required: ["title", "synopsis", "characters", "pages"],
};

interface RawStory {
  title: string;
  synopsis: string;
  characters: Character[];
  pages: Omit<StoryPage, "imageStatus" | "id" | "elements">[];
}

function parseStory(raw: string, pageCount: number): RawStory {
  let data: unknown;
  try {
    data = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
  } catch {
    throw new Error("Gemini returned malformed story data. Please try again.");
  }
  const d = data as Partial<RawStory>;
  const ok =
    d &&
    typeof d.title === "string" &&
    typeof d.synopsis === "string" &&
    Array.isArray(d.characters) &&
    Array.isArray(d.pages) &&
    d.pages.length > 0 &&
    d.pages.every((p) => typeof p?.text === "string" && typeof p?.illustrationPrompt === "string");
  if (!ok) throw new Error("Gemini returned an incomplete story. Please try again.");
  const pages = d.pages!.slice(0, pageCount).map((p, i) => ({
    pageNumber: i + 1,
    sceneTitle: String(p.sceneTitle ?? `Page ${i + 1}`),
    text: p.text,
    illustrationPrompt: p.illustrationPrompt,
    characters: Array.isArray(p.characters) ? p.characters.map(String) : [],
  }));
  return { title: d.title!, synopsis: d.synopsis!, characters: d.characters!, pages };
}

export async function generateStory(req: StoryRequest): Promise<Book> {
  const prompt = `Write a children's picture book in ${req.language} for ages ${req.ageGroup}.
Idea: ${req.idea}
${req.title ? `Use this title: ${req.title}` : "Invent a fitting title."}
Illustration style: ${req.style}.
Requirements:
- Exactly ${req.pageCount} pages with a clear beginning, middle and satisfying ending.
- Age-appropriate vocabulary and length (${req.ageGroup === "3-5" ? "1-2 short sentences" : req.ageGroup === "6-8" ? "2-4 sentences" : "3-5 sentences"} per page).
- "characters": every recurring character with a very detailed fixed visual description (species/age, body, face, fur/hair colors, clothing, accessories, proportions).
- Each page's "illustrationPrompt" must describe the scene visually (setting, action, mood, composition) in English, with no text in the image, and "characters" lists the names appearing.`;
  let text: string | undefined;
  try {
    const res = await ai().models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: storySchema },
    });
    text = res.text;
  } catch (e) {
    throw friendlyError(e);
  }
  if (!text) throw new Error("Gemini returned an empty response. Please try again.");
  const story = parseStory(text, req.pageCount);
  return {
    id: crypto.randomUUID(),
    title: req.title.trim() || story.title,
    synopsis: story.synopsis,
    characters: story.characters,
    pages: story.pages.map((p) => ({ ...p, id: crypto.randomUUID(), elements: [defaultTextElement(p.text)], imageStatus: "idle" as const })),
    ageGroup: req.ageGroup,
    style: req.style,
    language: req.language,
    idea: req.idea,
    coverStatus: "idle",
    updatedAt: Date.now(),
  };
}

export type ImageKind = "page" | "cover" | "element";

export async function generateImage(
  book: Book,
  scene: string,
  sceneCharacters: string[],
  reference?: string,
  kind: ImageKind = "page",
  sceneryOnly = false,
): Promise<string> {
  const names = sceneCharacters.map((n) => n.toLowerCase());
  const relevant = book.characters.filter((c) => names.length === 0 || names.some((n) => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase())));
  const chars = (relevant.length ? relevant : book.characters).map((c) => `- ${c.name}: ${c.description}`).join("\n");

  let prompt: string;
  if (kind === "element") {
    prompt = `Draw a single standalone ${book.style}-style illustration of: ${scene}. Plain solid pure-white background, nothing else in the frame, centered, no text or watermarks. Child-friendly, matching a picture book for ages ${book.ageGroup}.`;
  } else if (sceneryOnly) {
    prompt = `Create a wide, beautiful ${book.style}-style background scenery illustration for a children's picture book (ages ${book.ageGroup}), landscape orientation.
Scene: ${scene}
Show ONLY the environment: NO people, animals or characters. Keep the lower third calm and uncluttered so text can sit on it. No text, letters or watermarks.`;
  } else {
    prompt = `Create a ${kind === "cover" ? "book cover" : "picture book page"} illustration in ${book.style} style for a children's book (ages ${book.ageGroup}), landscape orientation, full-bleed scene with a rich detailed background.
Scene: ${scene}
Characters (keep their appearance, clothing, colors and proportions EXACTLY consistent in every illustration):
${chars}
${reference ? "The attached image is a previous illustration from this book; match its characters and art style exactly.\n" : ""}Do not include any text, letters, captions or watermarks. Keep the lower third relatively calm so text can be placed over it.${kind === "cover" ? `\nThe book is titled "${book.title}"; do not render the title.` : ""}`;
  }

  const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [{ text: prompt }];
  if (reference && kind !== "element") {
    const m = reference.match(/^data:(.+?);base64,(.+)$/);
    if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  try {
    const res = await ai().models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: "user", parts }],
      config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: kind === "element" ? "1:1" : "4:3" } },
    });
    for (const part of res.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) return `data:${part.inlineData.mimeType ?? "image/png"};base64,${part.inlineData.data}`;
    }
  } catch (e) {
    throw friendlyError(e);
  }
  throw new Error("Gemini did not return an image. Try again.");
}
