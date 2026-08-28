import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import MultiDocumentExportDialog from "../components/MultiDocumentExportDialog";

test("multi-document dialog exposes batch import, ordering, preview and downloads", () => {
  const html = renderToStaticMarkup(
    <MultiDocumentExportDialog open dark={false} onClose={() => undefined} onNotify={() => undefined} />,
  );
  assert.match(html, /多檔合併/u);
  assert.match(html, /選擇多份 MD/u);
  assert.match(html, /multiple=""/u);
  assert.match(html, /合併順序/u);
  assert.match(html, /檢查連結並預覽/u);
  assert.match(html, /下載合併 MD/u);
  assert.match(html, /下載單頁 HTML/u);
});

test("closed multi-document dialog renders nothing", () => {
  const html = renderToStaticMarkup(
    <MultiDocumentExportDialog open={false} dark={false} onClose={() => undefined} onNotify={() => undefined} />,
  );
  assert.equal(html, "");
});
