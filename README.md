# Storybook Maker (frontend-only demo)

Next.js app that generates illustrated children's books with Gemini (`@google/genai`).

## Run locally
1. Get a key at https://aistudio.google.com/apikey (use a restricted, temporary key).
2. `cp .env.example .env.local` and set `VITE_GEMINI_API_KEY`.
3. `npm install && npm run dev`, then open http://localhost:3000.

Models: text `gemini-3.8-flash`, images `gemini-nano-banana-2.1` (see `lib/gemini.ts`).
Books are saved in localStorage; PDF export uses jsPDF.

**Security:** the key is bundled into the browser. Use this for local demos only. Move Gemini calls to a backend before deploying publicly.
