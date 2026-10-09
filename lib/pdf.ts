import type { Book, PageElement } from "./types";

const W = 960, H = 720;
type RGB = [number, number, number];
const hex = (c = "#242720"): RGB => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as RGB;

export async function exportPdf(book: Book) {
  const { jsPDF, GState } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [W, H] });
  const bg = () => { doc.setFillColor(250, 247, 240); doc.rect(0, 0, W, H, "F"); };
  const img = (src: string | undefined, x: number, y: number, w: number, h: number) => {
    if (!src) return;
    try { doc.addImage(src, "JPEG", x, y, w, h); } catch {}
  };

  const drawElement = (el: PageElement) => {
    const x = (el.x / 100) * W, y = (el.y / 100) * H, w = (el.w / 100) * W;
    if (el.kind === "image" && el.src) {
      try {
        const p = doc.getImageProperties(el.src);
        doc.addImage(el.src, p.fileType, x, y, w, (w * p.height) / p.width);
      } catch {}
      return;
    }
    if (!el.text) return;
    const size = ((el.fontSize ?? 3.3) / 100) * W;
    const padX = 0.018 * W, padY = 0.012 * W;
    doc.setFont("times", el.bold ? "bold" : "normal").setFontSize(size).setLineHeightFactor(1.4);
    const lines: string[] = doc.splitTextToSize(el.text, w - 2 * padX);
    const h = lines.length * size * 1.4 + 2 * padY;
    if (el.panel) {
      doc.setGState(new GState({ opacity: 0.9 }));
      doc.setFillColor(250, 247, 240);
      doc.roundedRect(x, y, w, h, 0.012 * W, 0.012 * W, "F");
      doc.setGState(new GState({ opacity: 1 }));
    }
    doc.setTextColor(...hex(el.color));
    const align = el.align ?? "left";
    const tx = align === "center" ? x + w / 2 : align === "right" ? x + w - padX : x + padX;
    doc.text(lines, tx, y + padY, { align, baseline: "top" });
  };

  bg();
  img(book.cover, 0, 0, W, H);
  if (book.cover) {
    doc.setGState(new GState({ opacity: 0.85 }));
    doc.setFillColor(250, 247, 240);
    doc.roundedRect(60, 560, W - 120, 120, 14, 14, "F");
    doc.setGState(new GState({ opacity: 1 }));
  }
  doc.setFont("times", "bold").setFontSize(38).setTextColor(49, 92, 70);
  doc.text(doc.splitTextToSize(book.title, 800), W / 2, book.cover ? 620 : 340, { align: "center", baseline: "middle" });

  book.pages.forEach((p) => {
    doc.addPage([W, H], "landscape");
    bg();
    img(p.image, 0, 0, W, H);
    p.elements.forEach(drawElement);
  });
  doc.save(`${book.title.replace(/[^\w\- ]+/g, "").trim() || "storybook"}.pdf`);
}
