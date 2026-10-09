import { Suspense } from "react";
import { Reader } from "./Reader";

export default function ReaderPage() {
  return (
    <Suspense fallback={null}>
      <Reader />
    </Suspense>
  );
}
