"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Category, Inspo, InspoKind, Lane, Option, Skill, SkillFormat, Tool, ToolKind, ToolStatus } from "@/lib/types";
import { CATEGORIES, KINDS, SKILL_FORMATS, STATUSES } from "@/lib/types";
import { extractCommandFromText } from "@/lib/guess";
import { faviconUrl, hostname, isCommandValue, parseGithubRepo, skillFormatLabel } from "@/lib/search";
import { LanePicks } from "@/components/LanePicks";
import { ChipPicks } from "@/components/ChipPicks";
import { categoriesOf, subcategoriesOf } from "@/lib/search";
import { lanesOfInspo, lanesOfSkill, lanesOfTool } from "@/lib/lanes";

type Selection =
  | { type: "tool"; item: Tool }
  | { type: "inspo"; item: Inspo }
  | { type: "skill"; item: Skill };

type Props = {
  selection: Selection | null;
  admin?: boolean;
  categories?: Category[];
  kinds?: Option[];
  statuses?: Option[];
  categoryLanes?: Record<string, Option[]>;
  onClose: () => void;
  onSaveTool?: (tool: Tool) => void;
  onSaveInspo?: (item: Inspo) => void;
  onSaveSkill?: (item: Skill) => void;
  onAddCategory?: (label: string) => string | null | undefined;
  onAddLane?: (label: string, categoryId: string) => string | null | undefined;
  onDeleteCategory?: (id: string) => boolean | void;
  onDeleteLane?: (id: string, categoryId?: string, skipConfirm?: boolean) => boolean | void;
  onDeleteItem?: () => void;
  onAddStatus?: (label: string) => string | null | undefined;
  onDeleteStatus?: (id: string) => boolean | void;
  removableStatusIds?: string[];
};

function labelOf(options: Option[], id: string) {
  return options.find((item) => item.id === id)?.label ?? id;
}

export function DetailSheet({
  selection,
  admin = false,
  categories = CATEGORIES,
  kinds = KINDS,
  statuses = STATUSES,
  categoryLanes = {},
  onClose,
  onSaveTool,
  onSaveInspo,
  onSaveSkill,
  onAddCategory,
  onAddLane,
  onDeleteCategory,
  onDeleteLane,
  onDeleteItem,
  onAddStatus,
  onDeleteStatus,
  removableStatusIds,
}: Props) {
  const item = selection?.item;
  const url = item?.url ?? "";
  const urlRepo = url ? parseGithubRepo(url) : null;
  const repo =
    urlRepo ??
    (selection?.type === "tool" && selection.item.repo
      ? parseGithubRepo(`https://github.com/${selection.item.repo}`)
      : null);
  const [image, setImage] = useState("");
  const [remoteDescription, setRemoteDescription] = useState("");
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);
  const [copiedCommand, setCopiedCommand] = useState(false);

  useEffect(() => {
    setEditing(false);
    setDraft(item);
    setCopiedCommand(false);
  }, [item]);

  useEffect(() => {
    if (!selection) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onWheel(event: WheelEvent) {
      const info = document.querySelector(".sheet-info");
      if (info && info.contains(event.target as Node)) return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, [selection, onClose]);

  useEffect(() => {
    if (!url) return;
    if (isCommandValue(url) || (selection?.type === "tool" && selection.item.command)) {
      setImage("");
      setRemoteDescription("");
      setFailed(true);
      return;
    }
    let cancelled = false;
    setImage(repo ? `https://opengraph.githubassets.com/1/${repo.full}` : "");
    setRemoteDescription("");
    setFailed(false);

    fetch(`/api/lookup?url=${encodeURIComponent(url)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { image?: string; description?: string } | null) => {
        if (cancelled || !data) return;
        if (data.image) setImage(data.image);
        if (data.description) setRemoteDescription(data.description);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [url, repo?.full]);

  const categoryLabel = useMemo(() => {
    if (selection?.type !== "tool") return "";
    return categories.find((entry) => entry.id === selection.item.category)?.label ?? selection.item.category;
  }, [selection, categories]);

  if (!selection || !item || !draft) return null;

  const description = item.description || remoteDescription || "No description saved yet.";
  const tags = item.tags;
  const kindLabel =
    selection.type === "tool"
      ? selection.item.kind
      : selection.type === "skill"
        ? skillFormatLabel(selection.item.format)
        : selection.item.kind === "person"
          ? "Person"
          : "Site";

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const savedDraft = {
      ...draft,
      tags: Array.from(new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))),
    };
    if (selection?.type === "tool") onSaveTool?.(savedDraft as Tool);
    if (selection?.type === "inspo") onSaveInspo?.(savedDraft as Inspo);
    if (selection?.type === "skill") onSaveSkill?.(savedDraft as Skill);
    setEditing(false);
  }

  function addCategoryFromSheet(label: string) {
    const id = onAddCategory?.(label);
    if (!id || !draft) return;
    const current = categoriesOf(draft as Tool);
    const next = current.includes(id) ? current : [...current, id];
    setDraft({
      ...(draft as Tool),
      category: next[0],
      categories: next,
    });
  }

  function addLaneFromSheet(label: string) {
    if (!draft) return;
    const targets = categoriesOf(draft as Tool);
    if (!targets.length || !label.trim()) return;
    const added: string[] = [];
    for (const categoryId of targets) {
      const id = onAddLane?.(label, categoryId);
      if (id && !added.includes(id)) added.push(id);
    }
    if (!added.length) return;
    const current = subcategoriesOf(draft as Tool);
    const next = Array.from(new Set([...current, ...added]));
    setDraft({
      ...(draft as Tool),
      subcategory: next[0],
      subcategories: next,
    });
  }

  function addStatusFromSheet(label: string) {
    const id = onAddStatus?.(label);
    if (!id || !draft) return;
    setDraft({
      ...(draft as Tool),
      status: id,
    });
  }

  function deleteStatusFromSheet(id: string) {
    if (onDeleteStatus?.(id) === false) return;
    if (!draft) return;
    const fallback = statuses.find((item) => item.id !== id)?.id ?? "watching";
    setDraft({
      ...(draft as Tool),
      status: ((draft as Tool).status === id ? fallback : (draft as Tool).status) as ToolStatus,
    });
  }

  function deleteCategoryFromSheet(id: string) {
    if (onDeleteCategory?.(id) === false) return;
    if (!draft) return;
    const current = categoriesOf(draft as Tool).filter((item) => item !== id);
    const next = current.length ? current : [];
    setDraft({
      ...(draft as Tool),
      category: next[0] ?? "",
      categories: next,
      subcategories: subcategoriesOf(draft as Tool).filter((laneId) =>
        next.some((cat) => (categoryLanes[cat] ?? []).some((lane) => lane.id === laneId)),
      ),
    });
  }

  function deleteLaneFromSheet(id: string) {
    if (!draft) return;
    const targets = categoriesOf(draft as Tool);
    if (!targets.length) return;
    if (onDeleteLane?.(id, targets[0]) === false) return;
    for (const categoryId of targets.slice(1)) onDeleteLane?.(id, categoryId, true);
    const next = subcategoriesOf(draft as Tool).filter((item) => item !== id);
    setDraft({
      ...(draft as Tool),
      subcategory: next[0],
      subcategories: next,
    });
  }

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
          Close
        </button>
        <div className="sheet-preview">
          {image && !failed ? (
            <img src={image} alt="" onError={() => setFailed(true)} />
          ) : (
            <div className="sheet-fallback">
              <img src={faviconUrl(url, repo)} alt="" width={42} height={42} />
              <strong>{selection.type === "tool" && selection.item.command ? "CLI plugin" : hostname(url)}</strong>
              <span>{selection.type === "tool" && (selection.item.command || isCommandValue(url)) ? "Paste the command to copy it." : "No preview image for this link yet."}</span>
            </div>
          )}
        </div>
        <div className="sheet-info">
          {editing && admin ? (
            <form className="add-form sheet-edit" onSubmit={onSubmit}>
              <p className="kicker">Edit {selection.type}</p>
              <label>
                Name
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
              </label>
              <label>
                {(draft as Tool).command || isCommandValue(draft.url) ? "Command" : "URL"}
                <input
                  value={(draft as Tool).command || draft.url}
                  onChange={(e) => {
                    const value = e.target.value;
                    const command = extractCommandFromText(value);
                    if (command && !value.startsWith("http")) {
                      setDraft({
                        ...draft,
                        url: command,
                        command,
                      });
                      return;
                    }
                    setDraft({ ...draft, url: value, command: undefined });
                  }}
                  required
                />
              </label>
              <label>
                Description
                <input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </label>
              <LanePicks
                value={
                  selection.type === "tool"
                    ? lanesOfTool(draft as Tool)
                    : selection.type === "skill"
                      ? lanesOfSkill(draft as Skill)
                      : lanesOfInspo(draft as Inspo)
                }
                onChange={(lanes) => setDraft({ ...draft, lanes })}
              />
              {selection.type === "skill" ? (
                <>
                  <label>
                    Format
                    <select
                      value={(draft as Skill).format}
                      onChange={(e) => setDraft({ ...(draft as Skill), format: e.target.value as SkillFormat })}
                    >
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
                      value={(draft as Skill).file ?? ""}
                      onChange={(e) => setDraft({ ...(draft as Skill), file: e.target.value })}
                      placeholder="SKILL.md"
                    />
                  </label>
                </>
              ) : selection.type === "tool" ? (
                <>
                  <ChipPicks
                    legend="Categories"
                    hint="Pick one or more."
                    wrap
                    options={categories.filter((item) => item.id !== "all").map((item) => ({ id: item.id, label: item.label }))}
                    value={categoriesOf(draft as Tool)}
                    onChange={(next) =>
                      setDraft({
                        ...(draft as Tool),
                        category: next[0] ?? (draft as Tool).category,
                        categories: next,
                        subcategories: subcategoriesOf(draft as Tool).filter((id) =>
                          next.some((cat) => (categoryLanes[cat] ?? []).some((lane) => lane.id === id)),
                        ),
                      })
                    }
                    onAdd={addCategoryFromSheet}
                    onRemove={deleteCategoryFromSheet}
                    addLabel="New category"
                  />
                  <ChipPicks
                    legend="Lanes in these categories"
                    hint={
                      Array.from(
                        new Map(
                          categoriesOf(draft as Tool).flatMap((id) => (categoryLanes[id] ?? []).map((item) => [item.id, item])),
                        ).values(),
                      ).length
                        ? undefined
                        : "No category lanes yet."
                    }
                    wrap
                    options={Array.from(
                      new Map(
                        categoriesOf(draft as Tool).flatMap((id) => (categoryLanes[id] ?? []).map((item) => [item.id, item])),
                      ).values(),
                    )}
                    value={subcategoriesOf(draft as Tool)}
                    onChange={(next) =>
                      setDraft({
                        ...(draft as Tool),
                        subcategory: next[0],
                        subcategories: next,
                      })
                    }
                    onAdd={addLaneFromSheet}
                    onRemove={deleteLaneFromSheet}
                    addLabel="New lane"
                  />
                  <ChipPicks
                    legend="Status"
                    hint="Pick one. Use + to add a new status."
                    wrap
                    single
                    options={statuses}
                    value={[(draft as Tool).status]}
                    onChange={(next) =>
                      setDraft({
                        ...(draft as Tool),
                        status: (next[0] ?? (draft as Tool).status) as ToolStatus,
                      })
                    }
                    onAdd={addStatusFromSheet}
                    onRemove={deleteStatusFromSheet}
                    removableIds={removableStatusIds}
                    addLabel="New status"
                  />
                </>
              ) : (
                <label>
                  Type
                  <select
                    value={(draft as Inspo).kind}
                    onChange={(e) => setDraft({ ...(draft as Inspo), kind: e.target.value as InspoKind })}
                  >
                    <option value="site">Site</option>
                    <option value="person">Person</option>
                  </select>
                </label>
              )}
              <label>
                Tags
                <input
                  value={draft.tags.join(",")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tags: e.target.value.split(","),
                    })
                  }
                />
              </label>
              <div className="add-actions">
                <button type="submit">Save edits</button>
                <button type="button" className="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                {onDeleteItem ? (
                  <button type="button" className="danger" onClick={onDeleteItem}>
                    Delete
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <>
              <p className="kicker">{selection.type === "inspo" ? "Inspo" : selection.type === "skill" ? "Skill" : "Tool"}</p>
              <h2 id="sheet-title">{item.name}</h2>
              <p className="sheet-desc">{description}</p>
              <dl className="sheet-meta">
                <div>
                  <dt>{selection.type === "tool" && (selection.item.command || isCommandValue(url)) ? "Command" : urlRepo ? "GitHub repo" : "Website"}</dt>
                  <dd>{selection.type === "tool" && selection.item.command ? selection.item.command : urlRepo ? urlRepo.full : hostname(url)}</dd>
                </div>
                {selection.type === "tool" && repo && !urlRepo ? (
                  <div>
                    <dt>GitHub repo</dt>
                    <dd>{repo.full}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{selection.type === "inspo" ? "Type" : selection.type === "skill" ? "Format" : "Category"}</dt>
                  <dd>
                    {selection.type === "tool"
                      ? categoriesOf(selection.item)
                          .map((id) => categories.find((entry) => entry.id === id)?.label ?? id)
                          .join(" · ")
                      : kindLabel}
                  </dd>
                </div>
                {selection.type === "skill" && selection.item.file ? (
                  <div>
                    <dt>File</dt>
                    <dd>{selection.item.file}</dd>
                  </div>
                ) : null}
                {selection.type === "tool" ? (
                  <>
                    <div>
                      <dt>Lane</dt>
                      <dd>
                        {subcategoriesOf(selection.item).length
                          ? subcategoriesOf(selection.item)
                              .map((id) => {
                                const options = categoriesOf(selection.item).flatMap((cat) => categoryLanes[cat] ?? []);
                                return options.find((item) => item.id === id)?.label ?? id;
                              })
                              .join(" · ")
                          : "None yet"}
                      </dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{labelOf(statuses, selection.item.status)}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
              {tags.length > 0 ? (
                <ul className="tags">
                  {tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
              <p className="hint">
                Showing in{" "}
                {(selection.type === "tool"
                  ? lanesOfTool(item as Tool)
                  : selection.type === "skill"
                    ? lanesOfSkill(item as Skill)
                    : lanesOfInspo(item as Inspo)
                ).join(" · ")}
              </p>
              <div className="sheet-actions">
                {selection.type === "tool" && (selection.item.command || isCommandValue(url)) ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const command = selection.item.command || url;
                      await navigator.clipboard.writeText(command);
                      setCopiedCommand(true);
                      window.setTimeout(() => setCopiedCommand(false), 1400);
                    }}
                  >
                    {copiedCommand ? "Copied command" : "Copy command"}
                  </button>
                ) : (
                  <a href={url} target="_blank" rel="noreferrer">
                    Open site
                  </a>
                )}
                {selection.type === "tool" && repo && !urlRepo ? (
                  <a className="ghost" href={`https://github.com/${repo.full}`} target="_blank" rel="noreferrer">
                    Open GitHub
                  </a>
                ) : null}
                {admin ? (
                  <button type="button" className="ghost" onClick={() => setEditing(true)}>
                    Edit card
                  </button>
                ) : null}
                <button type="button" className="ghost" onClick={onClose}>
                  Keep browsing
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
