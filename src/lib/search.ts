import type { InboxInspo, InboxSkill, InboxTool, Inspo, InspoKind, Skill, SkillFormat, Tool, ToolKind, ToolStatus } from "@/lib/types";

export type GithubRepo = {
  owner: string;
  name: string;
  full: string;
};

export type Filters = {
  query: string;
  category: string;
  kind: ToolKind | "all";
  status: ToolStatus | "all";
  githubOnly: boolean;
  excludeMine?: boolean;
  subcategory?: string;
};

export function isCommandValue(value: string | undefined) {
  if (!value) return false;
  const trimmed = value.trim();
  return /^(npx|pnpm|yarn|bunx|npm|uvx|pipx|pip)\b/i.test(trimmed);
}

export function hostname(url: string) {
  if (isCommandValue(url)) return url;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function parseGithubRepo(url: string): GithubRepo | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "github.com" && host !== "www.github.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, name] = parts;
    if (!owner || !name) return null;
    if (["topics", "orgs", "collections", "settings", "notifications"].includes(owner)) {
      return null;
    }
    return {
      owner,
      name: name.replace(/\.git$/, ""),
      full: `${owner}/${name.replace(/\.git$/, "")}`,
    };
  } catch {
    return null;
  }
}

export function isMineTool(tool: Pick<Tool, "source" | "tags" | "lanes">) {
  return (
    tool.source === "mine" ||
    tool.tags.includes("mine") ||
    tool.tags.includes("made-by-me") ||
    Boolean(tool.lanes?.includes("mine"))
  );
}

export function categoriesOf(tool: Pick<Tool, "category" | "categories">) {
  const list = tool.categories?.length ? tool.categories : [tool.category];
  return Array.from(new Set(list.filter(Boolean)));
}

export function subcategoriesOf(tool: Pick<Tool, "subcategory" | "subcategories">) {
  const list = tool.subcategories?.length ? tool.subcategories : tool.subcategory ? [tool.subcategory] : [];
  return Array.from(new Set(list.filter(Boolean)));
}

export function toggleId(current: string[], id: string) {
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  return next.length ? next : current;
}

export function isGithubTool(tool: Pick<Tool, "url" | "source" | "repo" | "category">) {
  return (
    tool.source === "github" ||
    tool.category === "github" ||
    Boolean(tool.repo) ||
    Boolean(parseGithubRepo(tool.url))
  );
}

export function faviconUrl(url: string, repo?: GithubRepo | null) {
  if (repo) return `https://github.com/${repo.owner}.png?size=128`;
  if (isCommandValue(url)) return `https://www.google.com/s2/favicons?domain=npmjs.com&sz=128`;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname(url))}&sz=128`;
}

function haystack(tool: Tool) {
  const repo = tool.repo ?? parseGithubRepo(tool.url)?.full ?? "";
  return [
    tool.name,
    tool.description,
    tool.url,
    tool.command ?? "",
    tool.category,
    ...(tool.categories ?? []),
    tool.notes ?? "",
    tool.tags.join(" "),
    repo,
    "github",
    tool.source === "mine" ? "mine made by me" : "",
  ]
    .join(" ")
    .toLowerCase();
}

export function filterTools(tools: Tool[], filters: Filters) {
  const q = filters.query.trim().toLowerCase();
  return tools.filter((tool) => {
    if (filters.excludeMine && isMineTool(tool)) return false;
    if (filters.category !== "all" && !categoriesOf(tool).includes(filters.category)) return false;
    if (filters.subcategory && filters.subcategory !== "all" && !subcategoriesOf(tool).includes(filters.subcategory)) return false;
    if (filters.kind !== "all" && tool.kind !== filters.kind) return false;
    if (filters.status !== "all" && tool.status !== filters.status) return false;
    if (filters.githubOnly && !isGithubTool(tool)) return false;
    if (q && !haystack(tool).includes(q)) return false;
    return true;
  });
}

export function mergeCatalog(catalog: Tool[], inbox: InboxTool[]) {
  const seenIds = new Set(catalog.map((tool) => tool.id));
  const seenUrls = new Set(catalog.map((tool) => tool.url));
  const extras = inbox.filter((tool) => !seenIds.has(tool.id) && !seenUrls.has(tool.url));
  return [...extras, ...catalog];
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}


export function filterInspo(items: Inspo[], query: string, kind: InspoKind | "all") {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (kind !== "all" && item.kind !== kind) return false;
    if (!q) return true;
    const hay = [item.name, item.description, item.url, item.kind, item.notes ?? "", item.tags.join(" ")].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function mergeInspo(catalog: Inspo[], inbox: InboxInspo[]) {
  const seenIds = new Set(catalog.map((item) => item.id));
  const seenUrls = new Set(catalog.map((item) => item.url));
  const extras = inbox.filter((item) => !seenIds.has(item.id) && !seenUrls.has(item.url));
  return [...extras, ...catalog];
}

export function filterSkills(items: Skill[], query: string, format: SkillFormat | "all") {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (format !== "all" && item.format !== format) return false;
    if (!q) return true;
    const hay = [item.name, item.description, item.url, item.format, item.file ?? "", item.notes ?? "", item.tags.join(" ")].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function mergeSkills(catalog: Skill[], inbox: InboxSkill[]) {
  const seenIds = new Set(catalog.map((item) => item.id));
  const seenUrls = new Set(catalog.map((item) => item.url));
  const extras = inbox.filter((item) => !seenIds.has(item.id) && !seenUrls.has(item.url));
  return [...extras, ...catalog];
}

export function skillFormatLabel(format: SkillFormat) {
  if (format === "markdown") return "Markdown";
  if (format === "yaml") return "YAML";
  if (format === "json") return "JSON";
  if (format === "config") return "Config";
  return "Pack";
}

export function guessSkillFormat(url: string, file?: string): SkillFormat {
  const hay = `${url} ${file ?? ""}`.toLowerCase();
  if (hay.includes(".md") || hay.includes("skill.md") || hay.includes("agents.md") || hay.includes("design.md")) return "markdown";
  if (hay.includes(".yml") || hay.includes(".yaml")) return "yaml";
  if (hay.includes(".json")) return "json";
  if (hay.includes(".toml") || hay.includes(".xml") || hay.includes(".ini") || hay.includes("config")) return "config";
  if (hay.includes("/skills") || hay.includes("skill-pack") || hay.includes("skills/")) return "pack";
  return "markdown";
}
