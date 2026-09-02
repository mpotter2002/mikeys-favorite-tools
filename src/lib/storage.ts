import type { Category, InboxInspo, InboxSkill, InboxTool, Inspo, Option, Skill, Tool } from "@/lib/types";

const TOOL_KEY = "toolfolio.inbox.v1";
const INSPO_KEY = "toolfolio.inspo.v1";
const TOOL_EDITS_KEY = "toolfolio.tool-edits.v1";
const INSPO_EDITS_KEY = "toolfolio.inspo-edits.v1";
const CATEGORIES_KEY = "toolfolio.categories.v1";
const STATUSES_KEY = "toolfolio.statuses.v1";
const KINDS_KEY = "toolfolio.kinds.v1";
const SKILL_KEY = "toolfolio.skills.v1";
const SKILL_EDITS_KEY = "toolfolio.skill-edits.v1";
const CATEGORY_LANES_KEY = "toolfolio.category-lanes.v1";
const CATEGORY_LABELS_KEY = "toolfolio.category-labels.v1";
const HIDDEN_CATEGORIES_KEY = "toolfolio.hidden-categories.v1";
const HIDDEN_ITEMS_KEY = "toolfolio.hidden-items.v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readInbox(): InboxTool[] {
  const parsed = readJson<InboxTool[]>(TOOL_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function writeInbox(tools: InboxTool[]) {
  window.localStorage.setItem(TOOL_KEY, JSON.stringify(tools));
}

export function readInspoInbox(): InboxInspo[] {
  const parsed = readJson<InboxInspo[]>(INSPO_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function writeInspoInbox(items: InboxInspo[]) {
  window.localStorage.setItem(INSPO_KEY, JSON.stringify(items));
}

export function readToolEdits(): Record<string, Tool> {
  const parsed = readJson<Record<string, Tool>>(TOOL_EDITS_KEY, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

export function writeToolEdits(edits: Record<string, Tool>) {
  window.localStorage.setItem(TOOL_EDITS_KEY, JSON.stringify(edits));
}

export function readInspoEdits(): Record<string, Inspo> {
  const parsed = readJson<Record<string, Inspo>>(INSPO_EDITS_KEY, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

export function writeInspoEdits(edits: Record<string, Inspo>) {
  window.localStorage.setItem(INSPO_EDITS_KEY, JSON.stringify(edits));
}

export function applyEdits<T extends { id: string }>(items: T[], edits: Record<string, T>) {
  return items.map((item) => edits[item.id] ?? item);
}

export function readExtraCategories(): Category[] {
  const parsed = readJson<Category[]>(CATEGORIES_KEY, []);
  return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.label) : [];
}

export function writeExtraCategories(categories: Category[]) {
  window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function readExtraStatuses(): Option[] {
  const parsed = readJson<Option[]>(STATUSES_KEY, []);
  return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.label) : [];
}

export function writeExtraStatuses(statuses: Option[]) {
  window.localStorage.setItem(STATUSES_KEY, JSON.stringify(statuses));
}

export function readExtraKinds(): Option[] {
  const parsed = readJson<Option[]>(KINDS_KEY, []);
  return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.label && item.id !== "all") : [];
}

export function writeExtraKinds(kinds: Option[]) {
  window.localStorage.setItem(KINDS_KEY, JSON.stringify(kinds));
}

export function readSkillInbox(): InboxSkill[] {
  const parsed = readJson<InboxSkill[]>(SKILL_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function writeSkillInbox(items: InboxSkill[]) {
  window.localStorage.setItem(SKILL_KEY, JSON.stringify(items));
}

export function readSkillEdits(): Record<string, Skill> {
  const parsed = readJson<Record<string, Skill>>(SKILL_EDITS_KEY, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

export function writeSkillEdits(edits: Record<string, Skill>) {
  window.localStorage.setItem(SKILL_EDITS_KEY, JSON.stringify(edits));
}

export function readCategoryLanes(): Record<string, Option[]> {
  const parsed = readJson<Record<string, Option[]>>(CATEGORY_LANES_KEY, {});
  if (!parsed || typeof parsed !== "object") return {};
  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.filter((item) => item?.id && item?.label && item.id !== "all") : [],
    ]),
  );
}

export function writeCategoryLanes(lanes: Record<string, Option[]>) {
  window.localStorage.setItem(CATEGORY_LANES_KEY, JSON.stringify(lanes));
}

export function readCategoryLabels(): Record<string, string> {
  const parsed = readJson<Record<string, string>>(CATEGORY_LABELS_KEY, {});
  if (!parsed || typeof parsed !== "object") return {};
  return Object.fromEntries(
    Object.entries(parsed).filter(([id, label]) => typeof id === "string" && id && typeof label === "string" && label.trim()),
  );
}

export function writeCategoryLabels(labels: Record<string, string>) {
  window.localStorage.setItem(CATEGORY_LABELS_KEY, JSON.stringify(labels));
}

export function readHiddenCategories(): string[] {
  const parsed = readJson<string[]>(HIDDEN_CATEGORIES_KEY, []);
  return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string" && id && id !== "all") : [];
}

export function writeHiddenCategories(ids: string[]) {
  window.localStorage.setItem(HIDDEN_CATEGORIES_KEY, JSON.stringify(ids));
}

export function readHiddenItems(): string[] {
  const parsed = readJson<string[]>(HIDDEN_ITEMS_KEY, []);
  return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string" && id) : [];
}

export function writeHiddenItems(ids: string[]) {
  window.localStorage.setItem(HIDDEN_ITEMS_KEY, JSON.stringify(ids));
}
