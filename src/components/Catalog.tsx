"use client";

import { useEffect, useMemo, useState } from "react";
import { catalog } from "@/data/tools";
import { inspo as inspoCatalog } from "@/data/inspo";
import { skills as skillsCatalog } from "@/data/skills";
import {
  CATEGORIES,
  INSPO_KINDS,
  KINDS,
  SKILL_FORMATS,
  STATUSES,
  type Category,
  type InboxInspo,
  type InboxSkill,
  type InboxTool,
  type Inspo,
  type InspoKind,
  type Lane,
  type Option,
  type Skill,
  type SkillFormat,
  type Tool,
  type ToolKind,
  type ToolStatus,
} from "@/lib/types";
import { categoriesOf, filterInspo, filterSkills, filterTools, isGithubTool, isMineTool, mergeCatalog, mergeInspo, mergeSkills, slugify } from "@/lib/search";
import { inspoToSkill, inspoToTool, lanesOfInspo, lanesOfSkill, lanesOfTool, mergeByUrl, skillToInspo, skillToTool, toolToInspo, toolToSkill } from "@/lib/lanes";
import {
  applyEdits,
  readExtraCategories,
  readCategoryLanes,
  readExtraKinds,
  readExtraStatuses,
  readHiddenCategories,
  readHiddenItems,
  readInbox,
  readInspoEdits,
  readInspoInbox,
  readSkillEdits,
  readSkillInbox,
  readToolEdits,
  writeExtraCategories,
  writeCategoryLanes,
  writeExtraKinds,
  writeExtraStatuses,
  writeHiddenCategories,
  writeHiddenItems,
  writeInbox,
  writeInspoEdits,
  writeInspoInbox,
  writeSkillEdits,
  writeSkillInbox,
  writeToolEdits,
} from "@/lib/storage";
import { AddToolForm } from "@/components/AddToolForm";
import { AddInspoForm } from "@/components/AddInspoForm";
import { AddSkillForm } from "@/components/AddSkillForm";
import { ToolCard } from "@/components/ToolCard";
import { InspoCard } from "@/components/InspoCard";
import { SkillCard } from "@/components/SkillCard";
import { DetailSheet } from "@/components/DetailSheet";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Catalog() {
  const [lane, setLane] = useState<Lane>("tools");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState<ToolKind | "all">("all");
  const [subcategory, setSubcategory] = useState("all");
  const [status, setStatus] = useState<ToolStatus | "all">("all");
  const [githubOnly, setGithubOnly] = useState(false);
  const [inspoKind, setInspoKind] = useState<InspoKind | "all" | "">("");
  const [skillFormat, setSkillFormat] = useState<SkillFormat | "all" | "">("");
  const [inbox, setInbox] = useState<InboxTool[]>([]);
  const [inspoInbox, setInspoInbox] = useState<InboxInspo[]>([]);
  const [skillInbox, setSkillInbox] = useState<InboxSkill[]>([]);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<{ type: "tool"; item: Tool } | { type: "inspo"; item: Inspo } | { type: "skill"; item: Skill } | null>(null);
  const [admin, setAdmin] = useState(false);
  const [toolEdits, setToolEdits] = useState<Record<string, Tool>>({});
  const [inspoEdits, setInspoEdits] = useState<Record<string, Inspo>>({});
  const [skillEdits, setSkillEdits] = useState<Record<string, Skill>>({});
  const [extraCategories, setExtraCategories] = useState<Category[]>([]);
  const [extraStatuses, setExtraStatuses] = useState<Option[]>([]);
  const [extraKinds, setExtraKinds] = useState<Option[]>([]);
  const [categoryLanes, setCategoryLanes] = useState<Record<string, Option[]>>({});
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newKind, setNewKind] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");

  useEffect(() => {
    setInbox(readInbox());
    setInspoInbox(readInspoInbox());
    setSkillInbox(readSkillInbox());
    setToolEdits(readToolEdits());
    setInspoEdits(readInspoEdits());
    setSkillEdits(readSkillEdits());
    setExtraCategories(readExtraCategories());
    setExtraStatuses(readExtraStatuses());
    setExtraKinds(readExtraKinds());
    setCategoryLanes(readCategoryLanes());
    setHiddenCategories(readHiddenCategories());
    setHiddenItems(readHiddenItems());
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then((data: { admin?: boolean }) => setAdmin(Boolean(data.admin)))
      .catch(() => setAdmin(false));
  }, []);

  const toolsRaw = useMemo(
    () => applyEdits(mergeCatalog(catalog, inbox), toolEdits).filter((item) => !hiddenItems.includes(item.id)),
    [inbox, toolEdits, hiddenItems],
  );
  const inspoRaw = useMemo(
    () => applyEdits(mergeInspo(inspoCatalog, inspoInbox), inspoEdits).filter((item) => !hiddenItems.includes(item.id)),
    [inspoInbox, inspoEdits, hiddenItems],
  );
  const skillsRaw = useMemo(
    () => applyEdits(mergeSkills(skillsCatalog, skillInbox), skillEdits).filter((item) => !hiddenItems.includes(item.id)),
    [skillInbox, skillEdits, hiddenItems],
  );
  const tools = useMemo(() => {
    const fromSkills = skillsRaw.filter((item) => lanesOfSkill(item).includes("tools")).map(skillToTool);
    const fromInspo = inspoRaw.filter((item) => lanesOfInspo(item).includes("tools")).map(inspoToTool);
    return mergeByUrl(toolsRaw, mergeByUrl(fromSkills, fromInspo));
  }, [toolsRaw, skillsRaw, inspoRaw]);
  const inspoItems = useMemo(() => {
    const fromTools = toolsRaw.filter((item) => lanesOfTool(item).includes("inspo")).map(toolToInspo);
    const fromSkills = skillsRaw.filter((item) => lanesOfSkill(item).includes("inspo")).map(skillToInspo);
    return mergeByUrl(inspoRaw, mergeByUrl(fromTools, fromSkills));
  }, [inspoRaw, toolsRaw, skillsRaw]);
  const skillItems = useMemo(() => {
    const fromTools = toolsRaw.filter((item) => lanesOfTool(item).includes("skills")).map(toolToSkill);
    const fromInspo = inspoRaw.filter((item) => lanesOfInspo(item).includes("skills")).map(inspoToSkill);
    return mergeByUrl(skillsRaw, mergeByUrl(fromTools, fromInspo));
  }, [skillsRaw, toolsRaw, inspoRaw]);
  const githubCount = useMemo(() => tools.filter((tool) => isGithubTool(tool) && !isMineTool(tool)).length, [tools]);

  function hideItem(id: string) {
    setHiddenItems((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      writeHiddenItems(next);
      return next;
    });
  }

  function unhideItem(id: string) {
    setHiddenItems((current) => {
      if (!current.includes(id)) return current;
      const next = current.filter((item) => item !== id);
      writeHiddenItems(next);
      return next;
    });
  }
  const mineTools = useMemo(
    () =>
      mergeByUrl(
        tools.filter((tool) => lanesOfTool(tool).includes("mine") || isMineTool(tool)),
        [
          ...skillsRaw.filter((item) => lanesOfSkill(item).includes("mine")).map(skillToTool),
          ...inspoRaw.filter((item) => lanesOfInspo(item).includes("mine")).map(inspoToTool),
        ],
      ),
    [tools, skillsRaw, inspoRaw],
  );
  const stackTools = useMemo(
    () =>
      mergeByUrl(
        tools.filter((tool) => lanesOfTool(tool).includes("stack")),
        [
          ...skillsRaw.filter((item) => lanesOfSkill(item).includes("stack")).map(skillToTool),
          ...inspoRaw.filter((item) => lanesOfInspo(item).includes("stack")).map(inspoToTool),
        ],
      ),
    [tools, skillsRaw, inspoRaw],
  );
  const catalogTools = useMemo(
    () => tools.filter((tool) => lanesOfTool(tool).includes("tools")),
    [tools],
  );
  const searching = query.trim().length > 0;
  const toolsReady = searching || category !== "";
  const inspoReady = searching || inspoKind !== "";
  const skillsReady = searching || skillFormat !== "";
  const visibleTools = useMemo(
    () =>
      toolsReady
        ? filterTools(catalogTools, {
            query,
            category: category || "all",
            kind,
            status,
            githubOnly,
            excludeMine: true,
            subcategory,
          })
        : [],
    [catalogTools, query, category, kind, status, githubOnly, toolsReady, subcategory],
  );
  const visibleInspo = useMemo(
    () => (inspoReady ? filterInspo(inspoItems, query, inspoKind || "all") : []),
    [inspoItems, query, inspoKind, inspoReady],
  );
  const visibleSkills = useMemo(
    () => (skillsReady ? filterSkills(skillItems, query, skillFormat || "all") : []),
    [skillItems, query, skillFormat, skillsReady],
  );
  const selectedSkillFormat = SKILL_FORMATS.find((item) => item.id === skillFormat);
  const categories = useMemo(() => {
    const seen = new Set(CATEGORIES.map((item) => item.id));
    const extras = extraCategories.filter((item) => item.id !== "all" && !seen.has(item.id));
    return [...CATEGORIES, ...extras].filter((item) => item.id === "all" || !hiddenCategories.includes(item.id));
  }, [extraCategories, hiddenCategories]);
  const statuses = useMemo(() => {
    const seen = new Set(STATUSES.map((item) => item.id));
    return [...STATUSES, ...extraStatuses.filter((item) => !seen.has(item.id))];
  }, [extraStatuses]);
  const kinds = useMemo(() => {
    const seen = new Set(KINDS.map((item) => item.id));
    return [...KINDS, ...extraKinds.filter((item) => item.id !== "all" && !seen.has(item.id))];
  }, [extraKinds]);
  const selectedCategory = categories.find((item) => item.id === category);
  const currentCategoryLanes = useMemo(() => {
    if (!category || category === "all") return [];
    return categoryLanes[category] ?? [];
  }, [category, categoryLanes]);

  function addTool(tool: InboxTool) {
    const commandLike = Boolean(tool.command) || /\b(npx|pnpm|yarn|bunx|npm|uvx|pipx)\b/i.test(tool.url);
    const nextTool = commandLike
      ? {
          ...tool,
          command: tool.command || tool.url,
          category: tool.category || "agent",
          categories: Array.from(new Set([...(tool.categories ?? [tool.category].filter(Boolean)), "agent"])),
          tags: Array.from(new Set([...tool.tags, "plugin", "agent"])),
          kind: tool.kind || "agent",
          subcategory: tool.subcategory || "plugins",
          subcategories: Array.from(new Set([...(tool.subcategories ?? []), "plugins"])),
        }
      : tool;
    if (commandLike) {
      addCategory("Agent", "Agent tools, frameworks, and plugins.", false);
      addSubcategory("Plugins", "agent", false);
    }
    const next = [nextTool, ...inbox.filter((item) => item.id !== nextTool.id && item.url !== nextTool.url)];
    setInbox(next);
    writeInbox(next);
    unhideItem(nextTool.id);
  }

  function addOption(label: string, extras: Option[], builtins: Option[]) {
    const trimmed = label.trim();
    if (!trimmed) return null;
    const id = slugify(trimmed) || crypto.randomUUID();
    if (id === "all") return null;
    if (
      extras.some((item) => item.id === id || item.label.toLowerCase() === trimmed.toLowerCase()) ||
      builtins.some((item) => item.id === id || item.label.toLowerCase() === trimmed.toLowerCase())
    ) {
      return id;
    }
    return { id, label: trimmed };
  }

  function addCategory(label: string, description = "", selectBrowse = true) {
    const trimmed = label.trim();
    if (!trimmed) return null;
    const existing = [...CATEGORIES, ...extraCategories];
    const already = existing.find((item) => item.id === slugify(trimmed) || item.label.toLowerCase() === trimmed.toLowerCase());
    if (already) {
      setHiddenCategories((current) => {
        if (!current.includes(already.id)) return current;
        const next = current.filter((id) => id !== already.id);
        writeHiddenCategories(next);
        return next;
      });
      if (selectBrowse) setCategory(already.id);
      setNewCategory("");
      setNewCategoryDescription("");
      return already.id;
    }
    const option = addOption(trimmed, extraCategories, CATEGORIES);
    if (!option || typeof option === "string") {
      if (typeof option === "string") {
        if (selectBrowse) setCategory(option);
        setNewCategory("");
        setNewCategoryDescription("");
        return option;
      }
      return null;
    }
    const created = { ...option, description: description.trim() || undefined };
    setExtraCategories((current) => {
      if (current.some((item) => item.id === created.id)) return current;
      const next = [...current, created];
      writeExtraCategories(next);
      return next;
    });
    setHiddenCategories((current) => {
      if (!current.includes(created.id)) return current;
      const next = current.filter((id) => id !== created.id);
      writeHiddenCategories(next);
      return next;
    });
    if (selectBrowse) setCategory(created.id);
    setNewCategory("");
    setNewCategoryDescription("");
    return created.id;
  }

  function addStatus(label: string, selectBrowse = true) {
    const option = addOption(label, extraStatuses, STATUSES);
    if (!option || typeof option === "string") {
      if (typeof option === "string") {
        if (selectBrowse) setStatus(option);
        setNewStatus("");
        return option;
      }
      setNewStatus("");
      return null;
    }
    setExtraStatuses((current) => {
      if (current.some((item) => item.id === option.id)) return current;
      const next = [...current, option];
      writeExtraStatuses(next);
      return next;
    });
    if (selectBrowse) setStatus(option.id);
    setNewStatus("");
    return option.id;
  }

  function addKind(label: string) {
    const option = addOption(label, extraKinds, KINDS);
    if (!option || typeof option === "string") {
      if (typeof option === "string") setKind(option);
      setNewKind("");
      return;
    }
    setExtraKinds((current) => {
      const next = [...current, option];
      writeExtraKinds(next);
      return next;
    });
    setKind(option.id);
    setNewKind("");
  }

  function addSubcategory(label: string, categoryId = category, selectBrowse = true) {
    const target = categoryId && categoryId !== "all" ? categoryId : "";
    if (!target) return null;
    const trimmed = label.trim();
    if (!trimmed) return null;
    const existing = categoryLanes[target] ?? [];
    const already = existing.find((item) => item.id === slugify(trimmed) || item.label.toLowerCase() === trimmed.toLowerCase());
    if (already) {
      if (selectBrowse) setSubcategory(already.id);
      setNewSubcategory("");
      return already.id;
    }
    const option = addOption(trimmed, existing, []);
    if (!option || typeof option === "string") {
      if (typeof option === "string") {
        if (selectBrowse) setSubcategory(option);
        setNewSubcategory("");
        return option;
      }
      return null;
    }
    setCategoryLanes((current) => {
      const list = current[target] ?? [];
      if (list.some((item) => item.id === option.id)) return current;
      const next = { ...current, [target]: [...list, option] };
      writeCategoryLanes(next);
      return next;
    });
    if (selectBrowse) setSubcategory(option.id);
    setNewSubcategory("");
    return option.id;
  }

  function deleteCategory(id: string) {
    if (!id || id === "all") return false;
    const builtin = CATEGORIES.some((item) => item.id === id);
    const extra = extraCategories.some((item) => item.id === id);
    if (!builtin && !extra) return false;
    if (!window.confirm("Delete this category? Cards keep their other categories.")) return false;
    if (extra) {
      setExtraCategories((current) => {
        const next = current.filter((item) => item.id !== id);
        writeExtraCategories(next);
        return next;
      });
    }
    if (builtin || extra) {
      setHiddenCategories((current) => {
        if (current.includes(id)) return current;
        const next = [...current, id];
        writeHiddenCategories(next);
        return next;
      });
    }
    setCategoryLanes((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      writeCategoryLanes(next);
      return next;
    });
    if (category === id) {
      setCategory("");
      setSubcategory("all");
    }
    return true;
  }

  function deleteSubcategory(id: string, categoryId = category, skipConfirm = false) {
    const target = categoryId && categoryId !== "all" ? categoryId : "";
    if (!target || !id) return false;
    if (!skipConfirm && !window.confirm("Delete this lane from the category?")) return false;
    setCategoryLanes((current) => {
      const list = current[target] ?? [];
      const next = { ...current, [target]: list.filter((item) => item.id !== id) };
      writeCategoryLanes(next);
      return next;
    });
    if (subcategory === id) setSubcategory("all");
    return true;
  }

  function addInspo(item: InboxInspo) {
    const next = [item, ...inspoInbox.filter((entry) => entry.id !== item.id && entry.url !== item.url)];
    setInspoInbox(next);
    writeInspoInbox(next);
    unhideItem(item.id);
  }

  function addSkill(item: InboxSkill) {
    const next = [item, ...skillInbox.filter((entry) => entry.id !== item.id && entry.url !== item.url)];
    setSkillInbox(next);
    writeSkillInbox(next);
    unhideItem(item.id);
  }

  function saveTool(tool: Tool) {
    const next = { ...toolEdits, [tool.id]: tool };
    setToolEdits(next);
    writeToolEdits(next);
    setInbox((current) => {
      const updated = current.map((item) => (item.id === tool.id ? { ...item, ...tool } : item));
      writeInbox(updated);
      return updated;
    });
    setSelected({ type: "tool", item: tool });
  }

  function saveInspo(item: Inspo) {
    const next = { ...inspoEdits, [item.id]: item };
    setInspoEdits(next);
    writeInspoEdits(next);
    setInspoInbox((current) => {
      const updated = current.map((entry) => (entry.id === item.id ? { ...entry, ...item } : entry));
      writeInspoInbox(updated);
      return updated;
    });
    setSelected({ type: "inspo", item });
  }

  function saveSkill(item: Skill) {
    const next = { ...skillEdits, [item.id]: item };
    setSkillEdits(next);
    writeSkillEdits(next);
    setSkillInbox((current) => {
      const updated = current.map((entry) => (entry.id === item.id ? { ...entry, ...item } : entry));
      writeSkillInbox(updated);
      return updated;
    });
    setSelected({ type: "skill", item });
  }

  function dropEdit<T extends { id: string }>(edits: Record<string, T>, id: string) {
    if (!(id in edits)) return edits;
    const next = { ...edits };
    delete next[id];
    return next;
  }

  function deleteSelected() {
    if (!selected) return;
    const id = selected.item.id;
    const name = selected.item.name || "this card";
    if (!window.confirm(`Delete ${name}? This hides it from the site.`)) return;

    setInbox((current) => {
      const next = current.filter((item) => item.id !== id);
      writeInbox(next);
      return next;
    });
    setInspoInbox((current) => {
      const next = current.filter((item) => item.id !== id);
      writeInspoInbox(next);
      return next;
    });
    setSkillInbox((current) => {
      const next = current.filter((item) => item.id !== id);
      writeSkillInbox(next);
      return next;
    });

    setToolEdits((current) => {
      const next = dropEdit(current, id);
      writeToolEdits(next);
      return next;
    });
    setInspoEdits((current) => {
      const next = dropEdit(current, id);
      writeInspoEdits(next);
      return next;
    });
    setSkillEdits((current) => {
      const next = dropEdit(current, id);
      writeSkillEdits(next);
      return next;
    });

    hideItem(id);
    setSelected(null);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAdmin(false);
  }

  async function copyInbox() {
    const payload = JSON.stringify(lane === "inspo" ? inspoInbox : lane === "skills" ? skillInbox : inbox, null, 2);
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const visibleMine = useMemo(
    () =>
      toolsReady
        ? filterTools(mineTools, {
            query,
            category: category || "all",
            kind: "all",
            status: "all",
            githubOnly: false,
            subcategory,
          })
        : [],
    [mineTools, query, category, toolsReady, subcategory],
  );
  const visibleStack = useMemo(
    () =>
      toolsReady
        ? filterTools(stackTools, {
            query,
            category: category || "all",
            kind: "all",
            status: "all",
            githubOnly: false,
            subcategory,
          })
        : [],
    [stackTools, query, category, toolsReady, subcategory],
  );
  const showing = lane === "inspo" ? visibleInspo : lane === "mine" ? visibleMine : lane === "stack" ? visibleStack : lane === "skills" ? visibleSkills : visibleTools;
  const currentInbox = lane === "inspo" ? inspoInbox : lane === "skills" ? skillInbox : inbox;
  const browseReady = lane === "inspo" ? inspoReady : lane === "skills" ? skillsReady : toolsReady;

  function chooseLane(next: Lane) {
    setLane(next);
    setQuery("");
    setCategory("");
    setKind("all");
    setSubcategory("all");
    setStatus("all");
    setGithubOnly(false);
    setInspoKind("");
    setSkillFormat("");
  }

  function CategoryChip({
    item,
    active,
    onSelect,
    onDelete,
    kind = "cat",
  }: {
    item: { id: string; label: string };
    active: boolean;
    onSelect: () => void;
    onDelete?: () => void;
    kind?: "cat" | "chip";
  }) {
    return (
      <div className={`chip-wrap ${active ? "on" : ""}`}>
        <button type="button" className={`${kind}${active ? " on" : ""}`} onClick={onSelect}>
          {item.label}
        </button>
        {admin && onDelete && item.id !== "all" ? (
          <button
            type="button"
            className="chip-x"
            aria-label={`Delete ${item.label}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete();
            }}
          >
            ×
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="chrome">
        <ThemeToggle />
        {admin ? (
          <button type="button" className="ghost" onClick={logout}>
            Log out
          </button>
        ) : (
          <span />
        )}
      </div>
      <header className="hero">
        <div className="hero-copy">
          <p className="kicker">Personal stack</p>
          <h1>Mikey&apos;s Favorite Tools</h1>
          <p className="lede">
            One place for the design tools, agent tools, GitHub repos, what I am using right now, the tools I made, skills and configs, and the sites and people I keep going back to for inspo.
          </p>
        </div>
        <div className="stats">
          <div>
            <strong>{catalogTools.length}</strong>
            <span>tools & resources</span>
          </div>
          <div>
            <strong>{inspoItems.length}</strong>
            <span>inspo</span>
          </div>
          <div>
            <strong>{stackTools.length}</strong>
            <span>current stack</span>
          </div>
          <div>
            <strong>{mineTools.length}</strong>
            <span>built by me</span>
          </div>
          <div>
            <strong>{skillItems.length}</strong>
            <span>skills</span>
          </div>
        </div>
      </header>

      <div className="lanes">
        <button
          type="button"
          className={lane === "tools" ? "lane on" : "lane"}
          onClick={() => chooseLane("tools")}
        >
          Tools and resources
        </button>
        <button
          type="button"
          className={lane === "stack" ? "lane on" : "lane"}
          onClick={() => chooseLane("stack")}
        >
          Current stack
        </button>
        <button
          type="button"
          className={lane === "mine" ? "lane on" : "lane"}
          onClick={() => chooseLane("mine")}
        >
          Built by Mikey
        </button>
        <button
          type="button"
          className={lane === "skills" ? "lane on" : "lane"}
          onClick={() => chooseLane("skills")}
        >
          Skills
        </button>
        <button
          type="button"
          className={lane === "inspo" ? "lane on" : "lane"}
          onClick={() => chooseLane("inspo")}
        >
          Inspo
        </button>
      </div>

      <div className="toolbar">
        <label className="search">
          <span className="sr-only">{lane === "inspo" ? "Search inspo" : lane === "mine" ? "Search tools I made" : lane === "stack" ? "Search current stack" : lane === "skills" ? "Search skills" : "Search tools and resources"}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lane === "inspo" ? "Search sites, people, tags" : lane === "mine" ? "Search the tools I made" : lane === "stack" ? "Search what I am using now" : lane === "skills" ? "Search markdown, yaml, json, packs" : "Search tools, repos, resources"}
          />
        </label>
      </div>

      {lane === "stack" ? (
        <>
          <p className="hint category-desc">What I am actually using right now. Pick a category, or All to see the whole stack.</p>
          <div className="cats">
            {categories.map((item) => (
              <CategoryChip
                key={item.id}
                item={item}
                active={category === item.id}
                onSelect={() => {
                  setCategory(item.id);
                  setSubcategory("all");
                }}
                onDelete={item.id === "all" ? undefined : () => deleteCategory(item.id)}
              />
            ))}
            {admin ? (
              <form
                className="cat-add"
                onSubmit={(event) => {
                  event.preventDefault();
                  addCategory(newCategory, newCategoryDescription);
                }}
              >
                <input
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  placeholder="New category"
                />
                <input
                  value={newCategoryDescription}
                  onChange={(event) => setNewCategoryDescription(event.target.value)}
                  placeholder="Optional description"
                />
                <button type="submit">Add</button>
              </form>
            ) : null}
          </div>
          {selectedCategory?.description ? (
            <p className="hint category-desc">{selectedCategory.description}</p>
          ) : (
            <p className="hint category-desc">Pick a category first. Lanes live inside each category and start empty until you add them.</p>
          )}
          {category && category !== "all" ? (
            <div className="filters">
              <button
                type="button"
                className={subcategory === "all" ? "chip on" : "chip"}
                onClick={() => setSubcategory("all")}
              >
                All in {selectedCategory?.label ?? "category"}
              </button>
              {currentCategoryLanes.map((item) => (
                <CategoryChip
                  key={item.id}
                  item={item}
                  active={subcategory === item.id}
                  onSelect={() => setSubcategory(item.id)}
                  onDelete={() => deleteSubcategory(item.id)}
                  kind="chip"
                />
              ))}
              {admin ? (
                <form
                  className="cat-add"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addSubcategory(newSubcategory);
                  }}
                >
                  <input
                    value={newSubcategory}
                    onChange={(event) => setNewSubcategory(event.target.value)}
                    placeholder="New lane in this category"
                  />
                  <button type="submit">Add</button>
                </form>
              ) : currentCategoryLanes.length === 0 ? (
                <p className="hint">No lanes in this category yet.</p>
              ) : null}
            </div>
          ) : null}
          {admin && currentInbox.length > 0 ? (
            <div className="status-row">
              <button type="button" className="ghost" onClick={copyInbox}>
                {copied ? "Copied inbox JSON" : "Copy inbox JSON"}
              </button>
            </div>
          ) : null}
          {admin ? (
            <AddToolForm onAdd={addTool} categories={categories} kinds={kinds} statuses={statuses} categoryLanes={categoryLanes} defaultLanes={["stack"]} defaultCategory={category || undefined} />
          ) : null}
        </>
      ) : lane === "mine" ? (
        <>
          <p className="hint category-desc">Tools I made — pick a category, or All to see the whole set.</p>
          <div className="cats">
            {categories.map((item) => (
              <CategoryChip
                key={item.id}
                item={item}
                active={category === item.id}
                onSelect={() => {
                  setCategory(item.id);
                  setSubcategory("all");
                }}
                onDelete={item.id === "all" ? undefined : () => deleteCategory(item.id)}
              />
            ))}
            {admin ? (
              <form
                className="cat-add"
                onSubmit={(event) => {
                  event.preventDefault();
                  addCategory(newCategory, newCategoryDescription);
                }}
              >
                <input
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  placeholder="New category"
                />
                <input
                  value={newCategoryDescription}
                  onChange={(event) => setNewCategoryDescription(event.target.value)}
                  placeholder="Optional description"
                />
                <button type="submit">Add</button>
              </form>
            ) : null}
          </div>
          {selectedCategory?.description ? (
            <p className="hint category-desc">{selectedCategory.description}</p>
          ) : (
            <p className="hint category-desc">Pick a category first. Lanes live inside each category and start empty until you add them.</p>
          )}
          {category && category !== "all" ? (
            <div className="filters">
              <button
                type="button"
                className={subcategory === "all" ? "chip on" : "chip"}
                onClick={() => setSubcategory("all")}
              >
                All in {selectedCategory?.label ?? "category"}
              </button>
              {currentCategoryLanes.map((item) => (
                <CategoryChip
                  key={item.id}
                  item={item}
                  active={subcategory === item.id}
                  onSelect={() => setSubcategory(item.id)}
                  onDelete={() => deleteSubcategory(item.id)}
                  kind="chip"
                />
              ))}
              {admin ? (
                <form
                  className="cat-add"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addSubcategory(newSubcategory);
                  }}
                >
                  <input
                    value={newSubcategory}
                    onChange={(event) => setNewSubcategory(event.target.value)}
                    placeholder="New lane in this category"
                  />
                  <button type="submit">Add</button>
                </form>
              ) : currentCategoryLanes.length === 0 ? (
                <p className="hint">No lanes in this category yet.</p>
              ) : null}
            </div>
          ) : null}
          {admin && currentInbox.length > 0 ? (
            <div className="status-row">
              <button type="button" className="ghost" onClick={copyInbox}>
                {copied ? "Copied inbox JSON" : "Copy inbox JSON"}
              </button>
            </div>
          ) : null}
          {admin ? (
            <AddToolForm onAdd={addTool} categories={categories} kinds={kinds} statuses={statuses} categoryLanes={categoryLanes} defaultSource="mine" defaultLanes={["mine"]} defaultCategory={category || undefined} />
          ) : null}
        </>
      ) : lane === "tools" ? (
        <>
          <div className="cats">
            {categories.map((item) => (
              <CategoryChip
                key={item.id}
                item={item}
                active={category === item.id}
                onSelect={() => {
                  setCategory(item.id);
                  setSubcategory("all");
                }}
                onDelete={item.id === "all" ? undefined : () => deleteCategory(item.id)}
              />
            ))}
            {admin ? (
              <form
                className="cat-add"
                onSubmit={(event) => {
                  event.preventDefault();
                  addCategory(newCategory, newCategoryDescription);
                }}
              >
                <input
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  placeholder="New category"
                />
                <input
                  value={newCategoryDescription}
                  onChange={(event) => setNewCategoryDescription(event.target.value)}
                  placeholder="Optional description"
                />
                <button type="submit">Add</button>
              </form>
            ) : null}
          </div>
          {selectedCategory?.description ? (
            <p className="hint category-desc">{selectedCategory.description}</p>
          ) : (
            <p className="hint category-desc">Pick a category first. Lanes live inside each category and start empty until you add them.</p>
          )}

          {category && category !== "all" ? (
            <div className="filters">
              <button
                type="button"
                className={subcategory === "all" ? "chip on" : "chip"}
                onClick={() => setSubcategory("all")}
              >
                All in {selectedCategory?.label ?? "category"}
              </button>
              {currentCategoryLanes.map((item) => (
                <CategoryChip
                  key={item.id}
                  item={item}
                  active={subcategory === item.id}
                  onSelect={() => setSubcategory(item.id)}
                  onDelete={() => deleteSubcategory(item.id)}
                  kind="chip"
                />
              ))}
              {admin ? (
                <form
                  className="cat-add"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addSubcategory(newSubcategory);
                  }}
                >
                  <input
                    value={newSubcategory}
                    onChange={(event) => setNewSubcategory(event.target.value)}
                    placeholder="New lane in this category"
                  />
                  <button type="submit">Add</button>
                </form>
              ) : currentCategoryLanes.length === 0 ? (
                <p className="hint">No lanes in this category yet.</p>
              ) : null}
            </div>
          ) : null}

          {toolsReady ? (
            <>
              <div className="status-row">
                <button
                  type="button"
                  className={status === "all" ? "chip on" : "chip"}
                  onClick={() => setStatus("all")}
                >
                  Any status
                </button>
                {statuses.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={status === item.id ? "chip on" : "chip"}
                    onClick={() => setStatus(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
                {admin ? (
                  <form
                    className="cat-add"
                    onSubmit={(event) => {
                      event.preventDefault();
                      addStatus(newStatus);
                    }}
                  >
                    <input
                      value={newStatus}
                      onChange={(event) => setNewStatus(event.target.value)}
                      placeholder="New status"
                    />
                    <button type="submit">Add</button>
                  </form>
                ) : null}
                <div className="grow" />
                {admin && currentInbox.length > 0 ? (
                  <button type="button" className="ghost" onClick={copyInbox}>
                    {copied ? "Copied inbox JSON" : "Copy inbox JSON"}
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          {admin ? (
            <AddToolForm onAdd={addTool} categories={categories} kinds={kinds} statuses={statuses} categoryLanes={categoryLanes} defaultLanes={["tools"]} defaultCategory={category || undefined} />
          ) : null}
        </>
      ) : lane === "skills" ? (
        <>
          <div className="cats">
            {SKILL_FORMATS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={skillFormat === item.id ? "cat on" : "cat"}
                onClick={() => setSkillFormat(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {selectedSkillFormat?.description ? (
            <p className="hint category-desc">{selectedSkillFormat.description}</p>
          ) : (
            <p className="hint category-desc">Skills can be markdown, YAML, JSON, configs, or a whole pack. Pick a format, or All.</p>
          )}
          {admin && currentInbox.length > 0 ? (
            <div className="status-row">
              <button type="button" className="ghost" onClick={copyInbox}>
                {copied ? "Copied inbox JSON" : "Copy inbox JSON"}
              </button>
            </div>
          ) : null}
          {admin ? <AddSkillForm onAdd={addSkill} /> : null}
        </>
      ) : (
        <>
          <div className="filters">
            {INSPO_KINDS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={inspoKind === item.id ? "chip on" : "chip"}
                onClick={() => setInspoKind(item.id)}
              >
                {item.label}
              </button>
            ))}
            <div className="grow" />
            {admin && currentInbox.length > 0 ? (
              <button type="button" className="ghost" onClick={copyInbox}>
                {copied ? "Copied inbox JSON" : "Copy inbox JSON"}
              </button>
            ) : null}
          </div>
          {!inspoReady ? (
            <p className="hint category-desc">Pick sites, people, or All inspo. Search still looks across everything.</p>
          ) : null}
          {admin ? <AddInspoForm onAdd={addInspo} /> : null}
        </>
      )}

      {!browseReady ? (
        <div className="empty">
          {lane === "inspo"
            ? "Choose sites, people, or All inspo to start looking."
            : lane === "skills"
              ? "Choose markdown, YAML, JSON, config, packs, or All to start looking."
            : "Choose a category to start looking, or All if you want the whole lane."}
        </div>
      ) : showing.length === 0 ? (
        <div className="empty">
          {lane === "inspo"
            ? "Nothing matches. Drop a site or person into inspo."
            : lane === "stack"
              ? "Nothing in this stack view yet. Open a card and add it to Current stack, or drop a link here."
            : lane === "mine"
              ? "Nothing matches. Drop one of your repos here to add a tool you made."
              : lane === "skills"
                ? "Nothing matches. Drop a SKILL.md, YAML, JSON, or skill repo here."
            : "Nothing matches. Drop the filter or paste a GitHub URL into Add a tool."}
        </div>
      ) : (
        <section className="grid">
          {lane === "inspo"
            ? visibleInspo.map((item) => (
                <InspoCard key={item.id} item={item} onOpen={(entry) => setSelected({ type: "inspo", item: entry })} />
              ))
            : lane === "skills"
              ? visibleSkills.map((item) => (
                  <SkillCard key={item.id} item={item} onOpen={(entry) => setSelected({ type: "skill", item: entry })} />
                ))
            : (lane === "mine" ? visibleMine : lane === "stack" ? visibleStack : visibleTools).map((tool) => (
                <ToolCard key={tool.id} tool={tool} onOpen={(entry) => setSelected({ type: "tool", item: entry })} />
              ))}
        </section>
      )}
      <DetailSheet
        selection={selected}
        admin={admin}
        categories={categories}
        kinds={kinds}
        statuses={statuses}
        categoryLanes={categoryLanes}
        onClose={() => setSelected(null)}
        onSaveTool={saveTool}
        onSaveInspo={saveInspo}
        onSaveSkill={saveSkill}
        onAddCategory={(label) => addCategory(label, "", false)}
        onAddLane={(label, categoryId) => addSubcategory(label, categoryId, false)}
        onDeleteCategory={deleteCategory}
        onDeleteLane={deleteSubcategory}
        onDeleteItem={deleteSelected}
        onAddStatus={(label) => addStatus(label, false)}
      />
    </div>
  );
}
