"use client";

import { DragEvent, FormEvent, useMemo, useState } from "react";
import type { Category, InboxTool, Lane, Option, ToolKind, ToolSource, ToolStatus } from "@/lib/types";
import { CATEGORIES, KINDS, STATUSES } from "@/lib/types";
import { LanePicks } from "@/components/LanePicks";
import { ChipPicks } from "@/components/ChipPicks";
import {
  applyLookup,
  draftToId,
  extractDroppedUrl,
  extractUrlFromText,
  guessFromUrl,
  type ToolDraft,
} from "@/lib/guess";

type Props = {
  onAdd: (tool: InboxTool) => void;
  categories?: Category[];
  kinds?: Option[];
  statuses?: Option[];
  categoryLanes?: Record<string, Option[]>;
  defaultSource?: ToolSource;
  defaultLanes?: Lane[];
  defaultCategory?: string;
};

const emptyDraft: ToolDraft = {
  name: "",
  url: "",
  description: "",
  category: "ui",
  kind: "design",
  status: "watching",
  tags: [],
  source: "other",
  guessed: [],
};

export function AddToolForm({ onAdd, categories = CATEGORIES, kinds = KINDS, statuses = STATUSES, categoryLanes = {}, defaultSource, defaultLanes, defaultCategory }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ToolDraft>(emptyDraft);
  const [dragging, setDragging] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState("");
  const [lanes, setLanes] = useState<Lane[]>(defaultLanes ?? (defaultSource === "mine" ? ["mine"] : ["tools"]));
  const [subcategory, setSubcategory] = useState("");
  const [pickedCategories, setPickedCategories] = useState<string[]>([defaultCategory && defaultCategory !== "all" ? defaultCategory : "ui"]);
  const [pickedSubcategories, setPickedSubcategories] = useState<string[]>([]);

  const tags = useMemo(() => draft.tags.join(", "), [draft.tags]);
  const categoryLaneOptions = Array.from(
    new Map(
      pickedCategories.flatMap((id) => (categoryLanes[id] ?? []).map((item) => [item.id, item])),
    ).values(),
  );
  const missing = !draft.name.trim() || !draft.url.trim() || !draft.description.trim();

  function update<K extends keyof ToolDraft>(key: K, value: ToolDraft[K]) {
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
    setLanes(defaultLanes ?? (defaultSource === "mine" ? ["mine"] : ["tools"]));
    setSubcategory("");
    setPickedCategories([defaultCategory && defaultCategory !== "all" ? defaultCategory : "ui"]);
    setPickedSubcategories([]);
  }

  async function fillFromUrl(rawUrl: string) {
    const guessed = guessFromUrl(rawUrl);
    setDraft(guessed);
    setOpen(true);
    setError("");
    setLooking(true);
    try {
      const response = await fetch(`/api/lookup?url=${encodeURIComponent(guessed.url)}`);
      if (!response.ok) return;
      const extra = (await response.json()) as Partial<ToolDraft>;
      setDraft((current) => applyLookup(current, extra));
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

  function onPasteUrl(value: string) {
    const url = extractUrlFromText(value);
    if (url) void fillFromUrl(url);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.url.trim()) return;
    const source = defaultSource === "mine" || draft.source === "mine" ? "mine" : draft.source;
    const tags = Array.from(
      new Set(
        [
          ...draft.tags.map((tag) => tag.trim()).filter(Boolean),
          ...(source === "mine" ? ["mine"] : []),
        ],
      ),
    );
    onAdd({
      id: draftToId(draft) || crypto.randomUUID(),
      name: draft.name.trim(),
      url: draft.url.trim(),
      description: draft.description.trim() || "Saved from a dropped link.",
      category: pickedCategories[0] ?? draft.category,
      categories: pickedCategories,
      tags,
      kind: draft.kind,
      status: draft.status,
      source,
      repo: draft.repo,
      lanes,
      subcategory: pickedSubcategories[0] || subcategory || undefined,
      subcategories: pickedSubcategories.length ? pickedSubcategories : undefined,
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
        <strong>{dragging ? "Drop it" : defaultSource === "mine" ? "Drop one of yours" : "Drop a link"}</strong>
        <span>
          {defaultSource === "mine"
            ? "Drag a repo or site you made. I will fill in what I can and mark it as Built by Mikey."
            : "Drag a bookmark, GitHub repo, or URL here. I will fill in what I can."}
        </span>
        <input
          className="drop-paste"
          placeholder="or paste a URL / owner/repo"
          onPaste={(event) => onPasteUrl(event.clipboardData.getData("text/plain"))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onPasteUrl((event.target as HTMLInputElement).value);
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
              <input
                value={draft.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Figma or vercel/ai"
                required
              />
            </label>
            <label className={draft.guessed.includes("url") ? "guessed" : undefined}>
              URL or GitHub repo
              <input
                value={draft.url}
                onChange={(e) => update("url", e.target.value)}
                placeholder="https://github.com/vercel/ai"
                required
              />
            </label>
            <label className={`span-2 ${draft.guessed.includes("description") ? "guessed" : ""}`}>
              Why it is here
              <input
                value={draft.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Fill in anything the drop did not catch"
              />
            </label>
            <ChipPicks
              legend="Categories"
              hint="Pick one or more. A card can live in GitHub and UI."
              wrap
              options={categories.filter((item) => item.id !== "all").map((item) => ({ id: item.id, label: item.label }))}
              value={pickedCategories}
              onChange={(next) => {
                setPickedCategories(next);
                update("category", next[0] ?? draft.category);
                setPickedSubcategories((current) =>
                  current.filter((id) => next.some((cat) => (categoryLanes[cat] ?? []).some((lane) => lane.id === id))),
                );
              }}
            />
            {categoryLaneOptions.length ? (
              <ChipPicks
                legend="Lanes in these categories"
                hint="Optional. Only shows lanes you have added."
                wrap
                options={categoryLaneOptions}
                value={pickedSubcategories}
                onChange={setPickedSubcategories}
              />
            ) : (
              <p className="hint span-2">No category lanes yet. Add them after you pick a category on the page.</p>
            )}
            <label>
              Status
              <select value={draft.status} onChange={(e) => update("status", e.target.value as ToolStatus)}>
                {statuses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
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
                placeholder="github, agents, sdk"
              />
            </label>
            <LanePicks value={lanes} onChange={setLanes} />
          </div>
          <p className="hint">
            {looking
              ? "Looking the link up…"
              : error
                ? error
                : draft.repo
                  ? `Detected GitHub repo: ${draft.repo}`
                  : missing
                    ? "Add anything it missed, then save."
                    : "Looks complete. Save it or tweak first."}
          </p>
          <div className="add-actions">
            <button type="submit">Save to inbox</button>
            <button type="button" className="ghost" onClick={reset}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
