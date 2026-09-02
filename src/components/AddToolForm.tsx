"use client";

import { DragEvent, FormEvent, useMemo, useState } from "react";
import type { Category, InboxTool, Lane, Option, ToolKind, ToolSource, ToolStatus } from "@/lib/types";
import { CATEGORIES, KINDS, STATUSES } from "@/lib/types";
import { LanePicks } from "@/components/LanePicks";
import { ChipPicks } from "@/components/ChipPicks";
import { parseGithubRepo } from "@/lib/search";
import {
  applyLookup,
  draftToId,
  extractCommandFromText,
  extractDroppedUrl,
  extractUrlFromText,
  guessFromCommand,
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
  onAddCategory?: (label: string) => string | null | undefined;
  onAddLane?: (label: string, categoryId: string) => string | null | undefined;
  onDeleteCategory?: (id: string) => boolean | void;
  onDeleteLane?: (id: string, categoryId: string, skipConfirm?: boolean) => boolean | void;
  onAddStatus?: (label: string) => string | null | undefined;
  onDeleteStatus?: (id: string) => boolean | void;
  removableStatusIds?: string[];
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

function pluginLaneId(categoryLanes: Record<string, Option[]>) {
  return (categoryLanes.agent ?? []).find((item) => item.id === "plugins" || item.label.toLowerCase() === "plugins")?.id ?? "plugins";
}

export function AddToolForm({
  onAdd,
  categories = CATEGORIES,
  kinds = KINDS,
  statuses = STATUSES,
  categoryLanes = {},
  defaultSource,
  defaultLanes,
  defaultCategory,
  onAddCategory,
  onAddLane,
  onDeleteCategory,
  onDeleteLane,
  onAddStatus,
  onDeleteStatus,
  removableStatusIds,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ToolDraft>(emptyDraft);
  const [dragging, setDragging] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState("");
  const [lanes, setLanes] = useState<Lane[]>(defaultLanes ?? (defaultSource === "mine" ? ["mine"] : ["tools"]));
  const [subcategory, setSubcategory] = useState("");
  const [pickedCategories, setPickedCategories] = useState<string[]>([defaultCategory && defaultCategory !== "all" ? defaultCategory : "ui"]);
  const [pickedSubcategories, setPickedSubcategories] = useState<string[]>([]);

  const tags = useMemo(() => draft.tags.join(","), [draft.tags]);
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

  function applyCommand(command: string) {
    const guessed = guessFromCommand(command);
    const plugin = pluginLaneId(categoryLanes);
    setDraft(guessed);
    setPickedCategories(["agent"]);
    setPickedSubcategories([plugin]);
    setSubcategory(plugin);
    setOpen(true);
    setError("");
    setLooking(false);
  }

  async function fillFromUrl(rawUrl: string) {
    const command = extractCommandFromText(rawUrl);
    if (command && !extractUrlFromText(rawUrl)) {
      applyCommand(command);
      return;
    }
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
    const text = event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text/uri-list");
    const command = extractCommandFromText(text);
    if (command) {
      applyCommand(command);
      return;
    }
    const url = extractDroppedUrl(event.dataTransfer);
    if (!url) {
      setError("Could not find a link or command in that drop.");
      setOpen(true);
      return;
    }
    void fillFromUrl(url);
  }

  function onPasteUrl(value: string) {
    const command = extractCommandFromText(value);
    if (command && !extractUrlFromText(value)) {
      applyCommand(command);
      return;
    }
    const url = extractUrlFromText(value);
    if (url) void fillFromUrl(url);
  }

  function addCategory(label: string) {
    const id = onAddCategory?.(label);
    if (!id) return;
    const next = pickedCategories.includes(id) ? pickedCategories : [...pickedCategories, id];
    setPickedCategories(next);
    update("category", next[0] ?? draft.category);
  }

  function addLane(label: string) {
    if (!label.trim() || !pickedCategories.length) return;
    const added = pickedCategories
      .map((categoryId) => onAddLane?.(label, categoryId))
      .filter((id): id is string => Boolean(id));
    if (!added.length) return;
    setPickedSubcategories((current) => Array.from(new Set([...current, ...added])));
    setSubcategory(added[0]);
  }

  function deleteCategory(id: string) {
    if (onDeleteCategory?.(id) === false) return;
    const next = pickedCategories.filter((item) => item !== id);
    setPickedCategories(next);
    setPickedSubcategories((current) =>
      current.filter((laneId) => next.some((categoryId) => (categoryLanes[categoryId] ?? []).some((lane) => lane.id === laneId))),
    );
    update("category", next[0] ?? "");
  }

  function deleteLane(id: string) {
    if (!pickedCategories.length) return;
    if (onDeleteLane?.(id, pickedCategories[0]) === false) return;
    for (const categoryId of pickedCategories.slice(1)) onDeleteLane?.(id, categoryId, true);
    setPickedSubcategories((current) => current.filter((item) => item !== id));
    if (subcategory === id) setSubcategory("");
  }

  function addStatus(label: string) {
    const id = onAddStatus?.(label);
    if (!id) return;
    update("status", id as ToolStatus);
  }

  function deleteStatus(id: string) {
    if (onDeleteStatus?.(id) === false) return;
    if (draft.status === id) {
      update("status", (statuses.find((item) => item.id !== id)?.id ?? "watching") as ToolStatus);
    }
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
      description: draft.description.trim() || (draft.command ? `Install with ${draft.command}` : "Saved from a dropped link."),
      category: pickedCategories[0] ?? draft.category,
      categories: pickedCategories,
      tags,
      kind: draft.kind,
      status: draft.status,
      source,
      repo: draft.repo,
      command: draft.command,
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
            : "Drag a bookmark, GitHub repo, URL, or paste an npx / install command. I will fill in what I can."}
        </span>
        <input
          className="drop-paste"
          placeholder="or paste a URL, owner/repo, or npx command"
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
              {draft.command ? "Command" : "Website / URL"}
              <input
                value={draft.command || draft.url}
                onChange={(e) => {
                  const value = e.target.value;
                  if (extractCommandFromText(value) && !extractUrlFromText(value)) {
                    setDraft((current) => ({ ...guessFromCommand(value), guessed: current.guessed }));
                    return;
                  }
                  update("url", value);
                  update("command", undefined as never);
                }}
                placeholder={draft.command ? "npx some-agent-plugin" : "https://example.com"}
                required
              />
            </label>
            {!draft.command ? (
              <label className="span-2">
                GitHub repo (optional)
                <input
                  value={draft.repo ?? ""}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    const repo = parseGithubRepo(value);
                    update("repo", repo?.full ?? value.replace(/^https?:\/\/(?:www\.)?github\.com\//i, "").replace(/\/+$/, ""));
                  }}
                  placeholder="owner/repo or https://github.com/owner/repo"
                />
              </label>
            ) : null}
            <label className={`span-2 ${draft.guessed.includes("description") ? "guessed" : ""}`}>
              Why it is here
              <input
                value={draft.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Fill in anything the drop did not catch"
              />
            </label>
            <LanePicks value={lanes} onChange={setLanes} />
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
              onAdd={addCategory}
              onRemove={deleteCategory}
              addLabel="New category"
            />
            <ChipPicks
              legend="Lanes in these categories"
              hint={categoryLaneOptions.length ? "Optional. Only shows lanes you have added." : "No category lanes yet. Use + to add one."}
              wrap
              options={categoryLaneOptions}
              value={pickedSubcategories}
              onChange={setPickedSubcategories}
              onAdd={addLane}
              onRemove={deleteLane}
              addLabel="New lane"
            />
            <ChipPicks
              legend="Status"
              hint="Pick one. Use + to add a custom status."
              wrap
              single
              options={statuses}
              value={[draft.status]}
              onChange={(next) => update("status", (next[0] ?? draft.status) as ToolStatus)}
              onAdd={addStatus}
              onRemove={deleteStatus}
              removableIds={removableStatusIds}
              addLabel="New status"
            />
            <label className={draft.guessed.includes("tags") ? "guessed" : undefined}>
              Tags
              <input
                value={tags}
                onChange={(e) =>
                  update(
                    "tags",
                    e.target.value.split(","),
                  )
                }
                placeholder="github, agents, sdk"
              />
            </label>
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
            <button type="submit">Save to list</button>
            <button type="button" className="ghost" onClick={reset}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
