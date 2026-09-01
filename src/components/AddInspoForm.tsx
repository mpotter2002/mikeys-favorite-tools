"use client";

import { DragEvent, FormEvent, useMemo, useState } from "react";
import type { InboxInspo, InspoKind, Lane } from "@/lib/types";
import {
  applyInspoLookup,
  extractDroppedUrl,
  extractUrlFromText,
  guessInspoFromUrl,
  type InspoDraft,
} from "@/lib/guess";
import { slugify } from "@/lib/search";
import { LanePicks } from "@/components/LanePicks";

type Props = {
  onAdd: (item: InboxInspo) => void;
};

const emptyDraft: InspoDraft = {
  name: "",
  url: "",
  description: "",
  kind: "site",
  tags: [],
  guessed: [],
};

export function AddInspoForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<InspoDraft>(emptyDraft);
  const [dragging, setDragging] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState("");
  const [lanes, setLanes] = useState<Lane[]>(["inspo"]);
  const tags = useMemo(() => draft.tags.join(", "), [draft.tags]);

  function update<K extends keyof InspoDraft>(key: K, value: InspoDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      guessed: current.guessed.filter((item) => item !== key),
    }));
  }

  function reset() {
    setDraft(emptyDraft);
    setLooking(false);
    setError("");
    setOpen(false);
    setLanes(["inspo"]);
  }

  async function fillFromUrl(rawUrl: string) {
    const guessed = guessInspoFromUrl(rawUrl);
    setDraft(guessed);
    setOpen(true);
    setError("");
    setLooking(true);
    try {
      const response = await fetch(`/api/lookup?url=${encodeURIComponent(guessed.url)}`);
      if (!response.ok) return;
      const extra = (await response.json()) as Partial<InspoDraft>;
      setDraft((current) => applyInspoLookup(current, extra));
    } catch {
      setError("Could not look the page up. Fill in whatever is missing.");
    } finally {
      setLooking(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const url = extractDroppedUrl(event.dataTransfer);
    if (!url) {
      setError("Could not find a link in that drop.");
      setOpen(true);
      return;
    }
    void fillFromUrl(url);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.url.trim()) return;
    onAdd({
      id: slugify(draft.name) || slugify(draft.url) || crypto.randomUUID(),
      name: draft.name.trim(),
      url: draft.url.trim(),
      description: draft.description.trim() || "Saved from inspo.",
      kind: draft.kind,
      tags: Array.from(new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))),
      lanes,
      addedAt: new Date().toISOString(),
    });
    reset();
  }

  return (
    <div className="drop-stack">
      <div
        className={dragging ? "drop-box on" : "drop-box"}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <strong>{dragging ? "Drop it" : "Drop a site or person"}</strong>
        <span>Drag a portfolio, gallery, Twitter, or personal site. I will fill in what I can.</span>
        <input
          className="drop-paste"
          placeholder="or paste a URL"
          onPaste={(event) => {
            const url = extractUrlFromText(event.clipboardData.getData("text/plain"));
            if (url) void fillFromUrl(url);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const url = extractUrlFromText((event.target as HTMLInputElement).value);
              if (url) void fillFromUrl(url);
            }
          }}
        />
      </div>

      {!open ? (
        <button className="ghost" type="button" onClick={() => setOpen(true)}>
          Or fill it in
        </button>
      ) : (
        <form className="add-form" onSubmit={onSubmit}>
          <div className="add-grid">
            <label className={draft.guessed.includes("name") ? "guessed" : undefined}>
              Name
              <input value={draft.name} onChange={(e) => update("name", e.target.value)} required />
            </label>
            <label className={draft.guessed.includes("url") ? "guessed" : undefined}>
              URL
              <input value={draft.url} onChange={(e) => update("url", e.target.value)} required />
            </label>
            <label className={`span-2 ${draft.guessed.includes("description") ? "guessed" : ""}`}>
              Why they are inspo
              <input
                value={draft.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="What you steal from them"
              />
            </label>
            <label className={draft.guessed.includes("kind") ? "guessed" : undefined}>
              Type
              <select value={draft.kind} onChange={(e) => update("kind", e.target.value as InspoKind)}>
                <option value="site">Site</option>
                <option value="person">Person</option>
              </select>
            </label>
            <label className={draft.guessed.includes("tags") ? "guessed" : undefined}>
              Tags
              <input
                value={tags}
                onChange={(e) =>
                  update(
                    "tags",
                    e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean),
                  )
                }
                placeholder="web, motion, brand"
              />
            </label>
            <LanePicks value={lanes} onChange={setLanes} />
          </div>
          <p className="hint">
            {looking ? "Looking the link up…" : error || "Add anything it missed, then save."}
          </p>
          <div className="add-actions">
            <button type="submit">Save to inspo</button>
            <button type="button" className="ghost" onClick={reset}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
