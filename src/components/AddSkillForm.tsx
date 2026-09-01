"use client";

import { DragEvent, FormEvent, useMemo, useState } from "react";
import type { InboxSkill, Lane, SkillFormat } from "@/lib/types";
import { SKILL_FORMATS } from "@/lib/types";
import { LanePicks } from "@/components/LanePicks";
import {
  applySkillLookup,
  extractDroppedUrl,
  extractUrlFromText,
  guessSkillFromUrl,
  type SkillDraft,
} from "@/lib/guess";
import { slugify } from "@/lib/search";

type Props = {
  onAdd: (item: InboxSkill) => void;
};

const emptyDraft: SkillDraft = {
  name: "",
  url: "",
  description: "",
  format: "markdown",
  tags: [],
  guessed: [],
};

export function AddSkillForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SkillDraft>(emptyDraft);
  const [dragging, setDragging] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState("");
  const [lanes, setLanes] = useState<Lane[]>(["skills"]);
  const tags = useMemo(() => draft.tags.join(", "), [draft.tags]);

  function update<K extends keyof SkillDraft>(key: K, value: SkillDraft[K]) {
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
    setLanes(["skills"]);
  }

  async function fillFromUrl(rawUrl: string) {
    const guessed = guessSkillFromUrl(rawUrl);
    setDraft(guessed);
    setOpen(true);
    setError("");
    setLooking(true);
    try {
      const response = await fetch(`/api/lookup?url=${encodeURIComponent(guessed.url)}`);
      if (!response.ok) return;
      const extra = (await response.json()) as Partial<SkillDraft>;
      setDraft((current) => applySkillLookup(current, extra));
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
      description: draft.description.trim() || "Saved skill file or pack.",
      format: draft.format,
      tags: Array.from(new Set(["skill", ...draft.tags.map((tag) => tag.trim()).filter(Boolean)])),
      file: draft.file?.trim() || undefined,
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
        <strong>{dragging ? "Drop it" : "Drop a skill"}</strong>
        <span>Drag a SKILL.md, YAML, JSON, config, or a whole skill repo. I will fill in what I can.</span>
        <input
          className="drop-paste"
          placeholder="or paste a URL / owner/repo"
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
              Why it is here
              <input
                value={draft.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="What this skill is for"
              />
            </label>
            <label className={draft.guessed.includes("format") ? "guessed" : undefined}>
              Format
              <select value={draft.format} onChange={(e) => update("format", e.target.value as SkillFormat)}>
                {SKILL_FORMATS.filter((item) => item.id !== "all").map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              File name
              <input
                value={draft.file ?? ""}
                onChange={(e) => update("file", e.target.value)}
                placeholder="SKILL.md, agents.yaml, config.json"
              />
            </label>
            <label className={`span-2 ${draft.guessed.includes("tags") ? "guessed" : ""}`}>
              Tags
              <input
                value={tags}
                onChange={(e) =>
                  update(
                    "tags",
                    e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean),
                  )
                }
                placeholder="markdown, claude, design"
              />
            </label>
            <LanePicks value={lanes} onChange={setLanes} />
          </div>
          <p className="hint">
            {looking ? "Looking the link up…" : error || "Add anything it missed, then save."}
          </p>
          <div className="add-actions">
            <button type="submit">Save to skills</button>
            <button type="button" className="ghost" onClick={reset}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
