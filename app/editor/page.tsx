import { Suspense } from "react";
import { Editor } from "./Editor";

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}
