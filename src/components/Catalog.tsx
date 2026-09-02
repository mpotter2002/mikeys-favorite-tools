"use client";

import { useEffect, useMemo, useState } from "react";
import { catalog } from "@/data/tools";
import { inspo as inspoCatalog } from "@/data/inspo";
import { skills as skillsCatalog } from "@/data/skills";
import {
  CATEGORIES,
  INSPO_KINDS,
  KINDS,
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
  type Tool,
  type ToolKind,
  type ToolStatus,
} from "@/lib/types";
import { categoriesOf, filterInspo, filterTools, isGithubTool, isMineTool, mergeCatalog, mergeInspo, mergeSkills, slugify, subcategoriesOf } from "@/lib/search";
import { inspoToSkill, inspoToTool, lanesOfInspo, lanesOfSkill, lanesOfTool, mergeByUrl, skillToInspo, skillToTool, toolToInspo } from "@/lib/lanes";
import {
  applyEdits,
  readExtraCategories,
  readCategoryLanes,
  readCategoryLabels,
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
  writeCategoryLabels,
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
import { ToolCard } from "@/components/ToolCard";
import { InspoCard } from "@/components/InspoCard";
import { DetailSheet } from "@/components/DetailSheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";

type BrowseLane = Lane | "all";

function repairInboxIds(items: InboxTool[]) {
  const knownIds = new Map(catalog.map((item) => [item.id, item.url]));
  let changed = false;

  const repaired = items.map((item) => {
    const existingUrl = knownIds.get(item.id);
    if (!existingUrl || existingUrl === item.url) {
      knownIds.set(item.id, item.url);
      return item;
    }

    const baseId = `${item.id}-${slugify(item.url) || "site"}`;
    let id = baseId;
    let suffix = 2;
    while (knownIds.has(id) && knownIds.get(id) !== item.url) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    knownIds.set(id, item.url);
    changed = true;
    return { ...item, id };
  });

  return { items: repaired, changed };
}

export function Catalog() {
  const [lane, setLane] = useState<BrowseLane>("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [kind, setKind] = useState<ToolKind | "all">("all");
  const [subcategory, setSubcategory] = useState("all");
  const [status, setStatus] = useState<ToolStatus | "all">("all");
  const [githubOnly, setGithubOnly] = useState(false);
  const [inspoKind, setInspoKind] = useState<InspoKind | "all" | "">("");
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
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({});
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newKind, setNewKind] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");

  useEffect(() => {
    const storedInbox = readInbox();
    const repairedInbox = repairInboxIds(storedInbox);
    setInbox(repairedInbox.items);
    if (repairedInbox.changed) writeInbox(repairedInbox.items);
    setInspoInbox(readInspoInbox());
    setSkillInbox(readSkillInbox());
    setToolEdits(readToolEdits());
    setInspoEdits(readInspoEdits());
    setSkillEdits(readSkillEdits());
    setExtraCategories(readExtraCategories());
    setExtraStatuses(readExtraStatuses());
    setExtraKinds(readExtraKinds());
    setCategoryLanes(readCategoryLanes());
    setCategoryLabels(readCategoryLabels());
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
  const agentTools = useMemo(() => {
    const fromSkills = skillsRaw.filter((item) => lanesOfSkill(item).includes("skills")).map(skillToTool);
    const fromInspo = inspoRaw.filter((item) => lanesOfInspo(item).includes("skills")).map(inspoToTool);
    return mergeByUrl(
      toolsRaw.filter((item) => lanesOfTool(item).includes("skills")),
      mergeByUrl(fromSkills, fromInspo),
    );
  }, [toolsRaw, skillsRaw, inspoRaw]);
  const allTools = useMemo(
    () => mergeByUrl(toolsRaw, mergeByUrl(skillsRaw.map(skillToTool), inspoRaw.map(inspoToTool))),
    [toolsRaw, skillsRaw, inspoRaw],
  );
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
  const visibleTools = useMemo(
    () =>
      toolsReady
        ? filterTools(catalogTools, {
            query,
            category: category || "all",
            kind,
            status,
            githubOnly,
            excludeMine: false,
            subcategory,
          })
        : [],
    [catalogTools, query, category, kind, status, githubOnly, toolsReady, subcategory],
  );
  const visibleInspo = useMemo(
    () => (inspoReady ? filterInspo(inspoItems, query, inspoKind || "all") : []),
    [inspoItems, query, inspoKind, inspoReady],
  );
  const visibleAgents = useMemo(
    () =>
      toolsReady
        ? filterTools(agentTools, {
            query,
            category: category || "all",
            kind,
            status,
            githubOnly,
            subcategory,
          })
        : [],
    [agentTools, query, category, kind, status, githubOnly, toolsReady, subcategory],
  );
  const visibleAll = useMemo(
    () =>
      toolsReady
        ? filterTools(allTools, {
            query,
            category: category || "all",
            kind,
            status,
            githubOnly,
            subcategory,
          })
        : [],
    [allTools, query, category, kind, status, githubOnly, toolsReady, subcategory],
  );
  const categories = useMemo(() => {
    const seen = new Set(CATEGORIES.map((item) => item.id));
    const extras = extraCategories.filter((item) => item.id !== "all" && !seen.has(item.id));
    return [...CATEGORIES, ...extras]
      .filter((item) => item.id === "all" || !hiddenCategories.includes(item.id))
      .map((item) => ({ ...item, label: categoryLabels[item.id]?.trim() || item.label }));
  }, [extraCategories, hiddenCategories, categoryLabels]);
  const statuses = useMemo(() => {
    const seen = new Set(STATUSES.map((item) => item.id));
    return [...STATUSES, ...extraStatuses.filter((item) => !seen.has(item.id))];
  }, [extraStatuses]);
  const kinds = useMemo(() => {
    const seen = new Set(KINDS.map((item) => item.id));
    return [...KINDS, ...extraKinds.filter((item) => item.id !== "all" && !seen.has(item.id))];
  }, [extraKinds]);
  const selectedCategory = categories.find((item) => item.id === category);
  function addTool(tool: InboxTool) {
    const commandLike = Boolean(tool.command) || /\b(npx|pnpm|yarn|bunx|npm|uvx|pipx)\b/i.test(tool.url);
    const preparedTool = commandLike
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
    const matchingMineTool = commandLike
      ? undefined
      : toolsRaw.find(
          (item) =>
            isMineTool(item) &&
            slugify(item.name) === slugify(preparedTool.name) &&
            item.url !== preparedTool.url,
        );

    if (matchingMineTool) {
      const useIncomingDescription =
        preparedTool.description.trim() && preparedTool.description !== "Saved from a dropped link.";
      const combinedTool: Tool = {
        ...matchingMineTool,
        url: preparedTool.url,
        description: useIncomingDescription ? preparedTool.description : matchingMineTool.description,
        tags: Array.from(new Set([...matchingMineTool.tags, ...preparedTool.tags, "mine"])),
        source: "mine",
        lanes: preparedTool.lanes,
      };
      const nextEdits = { ...toolEdits, [combinedTool.id]: combinedTool };
      setToolEdits(nextEdits);
      writeToolEdits(nextEdits);
      setInbox((current) => {
        const next = current.filter((item) => item.id !== combinedTool.id && item.url !== preparedTool.url);
        writeInbox(next);
        return next;
      });
      unhideItem(combinedTool.id);
      setLane(combinedTool.lanes?.length ? combinedTool.lanes[0] : "all");
      setCategory(combinedTool.lanes?.length ? categoriesOf(combinedTool)[0] ?? "" : "all");
      setSubcategory("all");
      setQuery("");
      setKind("all");
      setStatus("all");
      setGithubOnly(false);
      setInspoKind("");
      return;
    }

    const existingById = [...catalog, ...inbox].find((item) => item.id === preparedTool.id);
    const nextTool =
      existingById && existingById.url !== preparedTool.url
        ? {
            ...preparedTool,
            id: `${preparedTool.id}-${slugify(preparedTool.url) || crypto.randomUUID()}`,
          }
        : preparedTool;

    if (commandLike) {
      addCategory("Agent", "Agent tools, frameworks, and plugins.", false);
      addSubcategory("Plugins", "agent", false);
    }
    const next = [nextTool, ...inbox.filter((item) => item.id !== nextTool.id && item.url !== nextTool.url)];
    setInbox(next);
    writeInbox(next);
    unhideItem(nextTool.id);

    const savedLanes = lanesOfTool(nextTool);
    const targetLane = savedLanes.length ? (lane !== "all" && savedLanes.includes(lane) ? lane : savedLanes[0]) : "all";
    const targetCategory = savedLanes.length ? categoriesOf(nextTool)[0] ?? "" : "all";

    setLane(targetLane);
    setCategory(targetCategory);
    setSubcategory("all");
    setQuery("");
    setKind("all");
    setStatus("all");
    setGithubOnly(false);
    setInspoKind("");
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

  function deleteStatus(id: string) {
    if (!extraStatuses.some((item) => item.id === id)) return false;
    if (!window.confirm("Delete this custom status? Cards will stay in the catalog.")) return false;
    setExtraStatuses((current) => {
      const next = current.filter((item) => item.id !== id);
      writeExtraStatuses(next);
      return next;
    });
    if (status === id) setStatus("all");
    return true;
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

  function renameCategory(id: string, currentLabel: string) {
    if (!id || id === "all") return;
    const label = window.prompt("Rename category", currentLabel)?.trim();
    if (!label || label === currentLabel) return;
    if (categories.some((item) => item.id !== id && item.label.toLowerCase() === label.toLowerCase())) {
      window.alert("A category with that name already exists.");
      return;
    }
    setCategoryLabels((current) => {
      const next = { ...current, [id]: label };
      writeCategoryLabels(next);
      return next;
    });
  }

  function renameSubcategory(id: string, currentLabel: string, categoryId = category) {
    const target = categoryId && categoryId !== "all" ? categoryId : "";
    if (!target || !id) return;
    const label = window.prompt("Rename lane", currentLabel)?.trim();
    if (!label || label === currentLabel) return;
    if ((categoryLanes[target] ?? []).some((item) => item.id !== id && item.label.toLowerCase() === label.toLowerCase())) {
      window.alert("A lane with that name already exists in this category.");
      return;
    }
    setCategoryLanes((current) => {
      const next = {
        ...current,
        [target]: (current[target] ?? []).map((item) => (item.id === id ? { ...item, label } : item)),
      };
      writeCategoryLanes(next);
      return next;
    });
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
    const payload = JSON.stringify(
      lane === "all"
        ? { tools: inbox, inspo: inspoInbox, agents: skillInbox }
        : lane === "inspo"
          ? inspoInbox
          : lane === "skills"
            ? [...inbox.filter((item) => lanesOfTool(item).includes("skills")), ...skillInbox]
            : inbox,
      null,
      2,
    );
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
  const cardsOnCurrentPage = useMemo(() => {
    if (lane === "all") return allTools;
    if (lane === "tools") return catalogTools;
    if (lane === "stack") return stackTools;
    if (lane === "mine") return mineTools;
    if (lane === "skills") return agentTools;
    return [];
  }, [lane, allTools, catalogTools, stackTools, mineTools, agentTools]);
  const pageCategories = useMemo(() => {
    const ids = new Set(cardsOnCurrentPage.flatMap((item) => categoriesOf(item)));
    // Keep an active category available to an admin while they are creating its first card.
    if (admin && category && category !== "all") ids.add(category);
    return categories.filter((item) => item.id === "all" || ids.has(item.id));
  }, [cardsOnCurrentPage, categories, category, admin]);
  const pageCategoryLanes = useMemo(() => {
    if (!category || category === "all") return [];
    const laneIds = new Set(
      cardsOnCurrentPage
        .filter((item) => categoriesOf(item).includes(category))
        .flatMap((item) => subcategoriesOf(item)),
    );
    // Keep an active lane available to an admin while they are creating its first card.
    if (admin && subcategory !== "all") laneIds.add(subcategory);
    return (categoryLanes[category] ?? []).filter((item) => laneIds.has(item.id));
  }, [cardsOnCurrentPage, category, categoryLanes, subcategory, admin]);
  const showing = lane === "all" ? visibleAll : lane === "inspo" ? visibleInspo : lane === "mine" ? visibleMine : lane === "stack" ? visibleStack : lane === "skills" ? visibleAgents : visibleTools;
  const currentInbox = lane === "all" ? [...inbox, ...inspoInbox, ...skillInbox] : lane === "inspo" ? inspoInbox : lane === "skills" ? [...inbox.filter((item) => lanesOfTool(item).includes("skills")), ...skillInbox] : inbox;
  const browseReady = lane === "inspo" ? inspoReady : toolsReady;

  function chooseLane(next: BrowseLane) {
    setLane(next);
    setQuery("");
    setCategory("all");
    setKind("all");
    setSubcategory("all");
    setStatus("all");
    setGithubOnly(false);
    setInspoKind("");
  }

  function CategoryChip({
    item,
    active,
    onSelect,
    onDelete,
    onRename,
    kind = "cat",
  }: {
    item: { id: string; label: string };
    active: boolean;
    onSelect: () => void;
    onDelete?: () => void;
    onRename?: () => void;
    kind?: "cat" | "chip";
  }) {
    return (
      <div className={`chip-wrap ${active ? "on" : ""}`}>
        <button
          type="button"
          className={`${kind}${active ? " on" : ""}`}
          onClick={onSelect}
          onDoubleClick={(event) => {
            if (!admin || !onRename) return;
            event.preventDefault();
            onRename();
          }}
          title={admin && onRename ? "Double-click to rename" : undefined}
        >
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
        <div className="chrome-actions">
          {admin ? (
            <button type="button" className="ghost" onClick={logout}>
              Log out
            </button>
          ) : null}
          <BrandMark />
        </div>
      </div>
      <header className="hero">
        <div className="hero-copy">
          <p className="kicker">Personal stack</p>
          <h1>Mikey&apos;s Favorite Things</h1>
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
            <strong>{agentTools.length}</strong>
            <span>AI / agents</span>
          </div>
        </div>
      </header>

      <div className="lanes">
        <button
          type="button"
          className={lane === "all" ? "lane on" : "lane"}
          onClick={() => chooseLane("all")}
        >
          All
        </button>
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
          AI / Agents
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
          <span className="sr-only">{lane === "all" ? "Search everything" : lane === "inspo" ? "Search inspo" : lane === "mine" ? "Search tools I made" : lane === "stack" ? "Search current stack" : lane === "skills" ? "Search AI and agent resources" : "Search tools and resources"}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lane === "all" ? "Search all tools, agents, skills, sites" : lane === "inspo" ? "Search sites, people, tags" : lane === "mine" ? "Search the tools I made" : lane === "stack" ? "Search what I am using now" : lane === "skills" ? "Search agents, skills, MCPs, frameworks" : "Search tools, repos, resources"}
          />
        </label>
      </div>

      {lane === "stack" ? (
        <>
          <p className="hint category-desc">What I am actually using right now. Pick a category, or All to see the whole stack.</p>
          <div className="cats">
            {pageCategories.map((item) => (
              <CategoryChip
                key={item.id}
                item={item}
                active={category === item.id}
                onSelect={() => {
                  setCategory(item.id);
                  setSubcategory("all");
                }}
                onDelete={item.id === "all" ? undefined : () => deleteCategory(item.id)}
                onRename={item.id === "all" ? undefined : () => renameCategory(item.id, item.label)}
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
              {pageCategoryLanes.map((item) => (
                <CategoryChip
                  key={item.id}
                  item={item}
                  active={subcategory === item.id}
                  onSelect={() => setSubcategory(item.id)}
                  onDelete={() => deleteSubcategory(item.id)}
                  onRename={() => renameSubcategory(item.id, item.label)}
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
              ) : pageCategoryLanes.length === 0 ? (
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
            <AddToolForm
              onAdd={addTool}
              categories={categories}
              kinds={kinds}
              statuses={statuses}
              categoryLanes={categoryLanes}
              defaultLanes={["stack"]}
              defaultCategory={category || undefined}
              onAddCategory={(label) => addCategory(label, "", false)}
              onAddLane={(label, categoryId) => addSubcategory(label, categoryId, false)}
              onDeleteCategory={deleteCategory}
              onDeleteLane={deleteSubcategory}
              onAddStatus={(label) => addStatus(label, false)}
              onDeleteStatus={deleteStatus}
              removableStatusIds={extraStatuses.map((item) => item.id)}
            />
          ) : null}
        </>
      ) : lane === "mine" ? (
        <>
          <p className="hint category-desc">Tools I made — pick a category, or All to see the whole set.</p>
          <div className="cats">
            {pageCategories.map((item) => (
              <CategoryChip
                key={item.id}
                item={item}
                active={category === item.id}
                onSelect={() => {
                  setCategory(item.id);
                  setSubcategory("all");
                }}
                onDelete={item.id === "all" ? undefined : () => deleteCategory(item.id)}
                onRename={item.id === "all" ? undefined : () => renameCategory(item.id, item.label)}
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
              {pageCategoryLanes.map((item) => (
                <CategoryChip
                  key={item.id}
                  item={item}
                  active={subcategory === item.id}
                  onSelect={() => setSubcategory(item.id)}
                  onDelete={() => deleteSubcategory(item.id)}
                  onRename={() => renameSubcategory(item.id, item.label)}
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
              ) : pageCategoryLanes.length === 0 ? (
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
            <AddToolForm
              onAdd={addTool}
              categories={categories}
              kinds={kinds}
              statuses={statuses}
              categoryLanes={categoryLanes}
              defaultSource="mine"
              defaultLanes={["mine"]}
              defaultCategory={category || undefined}
              onAddCategory={(label) => addCategory(label, "", false)}
              onAddLane={(label, categoryId) => addSubcategory(label, categoryId, false)}
              onDeleteCategory={deleteCategory}
              onDeleteLane={deleteSubcategory}
              onAddStatus={(label) => addStatus(label, false)}
              onDeleteStatus={deleteStatus}
              removableStatusIds={extraStatuses.map((item) => item.id)}
            />
          ) : null}
        </>
      ) : lane === "tools" || lane === "skills" || lane === "all" ? (
        <>
          <div className="cats">
            {pageCategories.map((item) => (
              <CategoryChip
                key={item.id}
                item={item}
                active={category === item.id}
                onSelect={() => {
                  setCategory(item.id);
                  setSubcategory("all");
                }}
                onDelete={item.id === "all" ? undefined : () => deleteCategory(item.id)}
                onRename={item.id === "all" ? undefined : () => renameCategory(item.id, item.label)}
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
              {pageCategoryLanes.map((item) => (
                <CategoryChip
                  key={item.id}
                  item={item}
                  active={subcategory === item.id}
                  onSelect={() => setSubcategory(item.id)}
                  onDelete={() => deleteSubcategory(item.id)}
                  onRename={() => renameSubcategory(item.id, item.label)}
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
              ) : pageCategoryLanes.length === 0 ? (
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
                  <div key={item.id} className={`chip-wrap ${status === item.id ? "on" : ""}`}>
                    <button
                      type="button"
                      className={status === item.id ? "chip on" : "chip"}
                      onClick={() => setStatus(item.id)}
                    >
                      {item.label}
                    </button>
                    {admin && extraStatuses.some((entry) => entry.id === item.id) ? (
                      <button
                        type="button"
                        className="chip-x"
                        aria-label={`Delete ${item.label}`}
                        onClick={() => deleteStatus(item.id)}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
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
            <AddToolForm
              onAdd={addTool}
              categories={categories}
              kinds={kinds}
              statuses={statuses}
              categoryLanes={categoryLanes}
              defaultLanes={lane === "skills" ? ["skills"] : ["tools"]}
              defaultCategory={category || undefined}
              onAddCategory={(label) => addCategory(label, "", false)}
              onAddLane={(label, categoryId) => addSubcategory(label, categoryId, false)}
              onDeleteCategory={deleteCategory}
              onDeleteLane={deleteSubcategory}
              onAddStatus={(label) => addStatus(label, false)}
              onDeleteStatus={deleteStatus}
              removableStatusIds={extraStatuses.map((item) => item.id)}
            />
          ) : null}
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
            : lane === "all"
              ? "Choose a category, or use All to browse everything."
              : lane === "skills"
              ? "Choose a category to start looking through AI and agent resources, or All for the whole section."
            : "Choose a category to start looking, or All if you want the whole lane."}
        </div>
      ) : showing.length === 0 ? (
        <div className="empty">
          {lane === "inspo"
            ? "Nothing matches. Drop a site or person into inspo."
            : lane === "all"
              ? "Nothing matches across your list. Try another search or filter."
              : lane === "stack"
              ? "Nothing in this stack view yet. Open a card and add it to Current stack, or drop a link here."
              : lane === "mine"
                ? "Nothing matches. Drop one of your repos here to add a tool you made."
                : lane === "skills"
                ? "Nothing matches. Drop an agent tool, framework, skill, or config here."
            : "Nothing matches. Drop the filter or paste a GitHub URL into Add a tool."}
        </div>
      ) : (
        <section className="grid">
          {lane === "inspo"
            ? visibleInspo.map((item) => (
                <InspoCard key={item.id} item={item} onOpen={(entry) => setSelected({ type: "inspo", item: entry })} />
              ))
            : lane === "skills"
              ? visibleAgents.map((item) => (
                  <ToolCard key={item.id} tool={item} onOpen={(entry) => setSelected({ type: "tool", item: entry })} />
                ))
            : (lane === "all" ? visibleAll : lane === "mine" ? visibleMine : lane === "stack" ? visibleStack : visibleTools).map((tool) => (
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
        onDeleteStatus={deleteStatus}
        removableStatusIds={extraStatuses.map((item) => item.id)}
      />
    </div>
  );
}
