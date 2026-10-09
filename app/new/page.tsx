"use client";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { generateStory } from "@/lib/gemini";
import { saveBook } from "@/lib/storage";
import type { AgeGroup, IllustrationStyle } from "@/lib/types";

const STYLES: IllustrationStyle[] = ["watercolor", "cartoon", "storybook", "3D"];
const EXAMPLE = "A little fox discovers a magical forest where the stars grow on trees.";

export default function NewStory() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [title, setTitle] = useState("");
  const [age, setAge] = useState<AgeGroup>("3-5");
  const [pages, setPages] = useState(6);
  const [style, setStyle] = useState<IllustrationStyle>("watercolor");
  const [language, setLanguage] = useState("English");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (idea.trim().length < 10) {
      setError("Describe your story idea in a sentence or two (at least 10 characters).");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const book = await generateStory({ idea: idea.trim(), title, ageGroup: age, pageCount: pages, style, language: language.trim() || "English" });
      const err = saveBook(book);
      if (err) throw new Error(err);
      router.push(`/editor?id=${book.id}&generate=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const label = "mb-1.5 block text-sm font-medium";
  const seg = (active: boolean) =>
    `flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition ${active ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-[#f3eee1]"}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-forest hover:underline">
        <ArrowLeft className="h-4 w-4" /> My library
      </Link>
      <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">Turn your imagination into a storybook.</h1>
      <p className="mt-3 text-ink/70">Describe an idea. Gemini writes the story and paints every page.</p>

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
        <div>
          <label className={label} htmlFor="idea">Story idea</label>
          <textarea id="idea" className="field min-h-32 resize-y" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={EXAMPLE} />
          <button type="button" className="mt-1.5 text-sm text-forest underline" onClick={() => setIdea(EXAMPLE)}>Use example</button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="title">Book title <span className="text-ink/50">(optional)</span></label>
            <input id="title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="lang">Story language</label>
            <input id="lang" className="field" value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
          <div>
            <span className={label}>Age group</span>
            <div className="flex gap-2">
              {(["3-5", "6-8", "9-12"] as AgeGroup[]).map((a) => (
                <button type="button" key={a} className={seg(age === a)} onClick={() => setAge(a)}>{a}</button>
              ))}
            </div>
          </div>
          <div>
            <span className={label}>Number of pages</span>
            <div className="flex gap-2">
              {[4, 6, 8].map((n) => (
                <button type="button" key={n} className={seg(pages === n)} onClick={() => setPages(n)}>{n}</button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <span className={label}>Illustration style</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STYLES.map((s) => (
              <button type="button" key={s} className={seg(style === s)} onClick={() => setStyle(s)}>{s}</button>
            ))}
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <button className="btn btn-primary w-full py-3 text-base" disabled={busy}>
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Writing your story…</> : <><Sparkles className="h-5 w-5" /> Generate My Storybook</>}
        </button>
      </form>

    </main>
  );
}
