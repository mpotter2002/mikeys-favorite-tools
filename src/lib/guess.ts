import type { InspoKind, SkillFormat, ToolKind, ToolSource, ToolStatus } from "@/lib/types";
import { guessSkillFormat, parseGithubRepo, slugify } from "@/lib/search";

export type ToolDraft = {
  name: string;
  url: string;
  description: string;
  category: string;
  kind: ToolKind;
  status: ToolStatus;
  tags: string[];
  source: ToolSource;
  repo?: string;
  command?: string;
  guessed: string[];
};

type HostHint = {
  name?: string;
  category: string;
  kind: ToolKind;
  tags?: string[];
};

const HOST_HINTS: Record<string, HostHint> = {
  "figma.com": { name: "Figma", category: "ui", kind: "design", tags: ["ui", "design"] },
  "framer.com": { name: "Framer", category: "prototype", kind: "design", tags: ["web", "prototype"] },
  "v0.dev": { name: "v0", category: "ui", kind: "both", tags: ["ai", "ui"] },
  "cursor.com": { name: "Cursor", category: "ides", kind: "ide", tags: ["ide", "coding"] },
  "claude.ai": { name: "Claude", category: "research", kind: "agent", tags: ["chat"] },
  "chatgpt.com": { name: "ChatGPT", category: "research", kind: "agent", tags: ["chat"] },
  "chat.openai.com": { name: "ChatGPT", category: "research", kind: "agent", tags: ["chat"] },
  "grok.com": { name: "Grok", category: "research", kind: "agent", tags: ["chat"] },
  "x.com": { category: "inspiration", kind: "both", tags: ["twitter"] },
  "twitter.com": { category: "inspiration", kind: "both", tags: ["twitter"] },
  "midjourney.com": { name: "Midjourney", category: "image", kind: "design", tags: ["image"] },
  "runwayml.com": { name: "Runway", category: "video", kind: "design", tags: ["video"] },
  "klingai.com": { name: "Kling", category: "video", kind: "design", tags: ["video"] },
  "pika.art": { name: "Pika", category: "video", kind: "design", tags: ["video"] },
  "higgsfield.ai": { name: "Higgsfield", category: "video", kind: "design", tags: ["video"] },
  "luma.ai": { name: "Luma", category: "video", kind: "design", tags: ["video"] },
  "krea.ai": { name: "Krea", category: "image", kind: "design", tags: ["image"] },
  "recraft.ai": { name: "Recraft", category: "image", kind: "design", tags: ["vector"] },
  "ideogram.ai": { name: "Ideogram", category: "image", kind: "design", tags: ["image", "type"] },
  "leonardo.ai": { name: "Leonardo", category: "image", kind: "design", tags: ["image"] },
  "blackforestlabs.ai": { name: "Flux", category: "image", kind: "design", tags: ["image"] },
  "spline.design": { name: "Spline", category: "prototype", kind: "design", tags: ["3d"] },
  "rive.app": { name: "Rive", category: "prototype", kind: "design", tags: ["motion"] },
  "mobbin.com": { name: "Mobbin", category: "inspiration", kind: "design", tags: ["reference"] },
  "are.na": { name: "Are.na", category: "inspiration", kind: "design", tags: ["moodboard"] },
  "dribbble.com": { name: "Dribbble", category: "inspiration", kind: "design", tags: ["inspiration"] },
  "behance.net": { name: "Behance", category: "inspiration", kind: "design", tags: ["inspiration"] },
  "pinterest.com": { name: "Pinterest", category: "inspiration", kind: "design", tags: ["moodboard"] },
  "youtube.com": { category: "video", kind: "design", tags: ["video"] },
  "youtu.be": { category: "video", kind: "design", tags: ["video"] },
  "huggingface.co": { category: "research", kind: "agent", tags: ["models"] },
  "replicate.com": { name: "Replicate", category: "image", kind: "both", tags: ["models"] },
  "fal.ai": { name: "fal", category: "image", kind: "both", tags: ["models"] },
  "elevenlabs.io": { name: "ElevenLabs", category: "audio", kind: "design", tags: ["voice"] },
  "suno.com": { name: "Suno", category: "audio", kind: "design", tags: ["music"] },
  "udio.com": { name: "Udio", category: "audio", kind: "design", tags: ["music"] },
  "notion.so": { name: "Notion", category: "research", kind: "both", tags: ["docs"] },
  "linear.app": { name: "Linear", category: "infra", kind: "both", tags: ["pm"] },
  "vercel.com": { name: "Vercel", category: "infra", kind: "both", tags: ["hosting"] },
  "supabase.com": { name: "Supabase", category: "infra", kind: "agent", tags: ["backend"] },
  "n8n.io": { name: "n8n", category: "infra", kind: "agent", tags: ["automation"] },
  "perplexity.ai": { name: "Perplexity", category: "research", kind: "agent", tags: ["search"] },
  "tldraw.com": { name: "tldraw", category: "prototype", kind: "design", tags: ["canvas"] },
  "excalidraw.com": { name: "Excalidraw", category: "prototype", kind: "design", tags: ["diagram"] },
  "coolors.co": { name: "Coolors", category: "ui", kind: "design", tags: ["color"] },
  "fontshare.com": { name: "Fontshare", category: "ui", kind: "design", tags: ["type"] },
  "unsplash.com": { name: "Unsplash", category: "inspiration", kind: "design", tags: ["photo"] },
  "relume.io": { name: "Relume", category: "ui", kind: "both", tags: ["wireframe"] },
  "webflow.com": { name: "Webflow", category: "prototype", kind: "design", tags: ["web"] },
  "raycast.com": { name: "Raycast", category: "infra", kind: "both", tags: ["launcher"] },
  "obsidian.md": { name: "Obsidian", category: "research", kind: "both", tags: ["notes"] },
};

const CATEGORY_WORDS: Record<string, string[]> = {
  ides: ["ide", "editor", "vscode", "cursor", "zed", "windsurf", "codex"],
  image: ["image", "img", "art", "draw", "paint", "diffusion", "midjourney", "flux", "icon"],
  video: ["video", "film", "motion", "clip", "runway", "kling", "pika"],
  ui: ["ui", "design", "figma", "component", "css", "color", "font", "type"],
  prototype: ["proto", "framer", "spline", "rive", "webflow", "canvas"],
  research: ["docs", "wiki", "search", "research", "paper"],
  audio: ["audio", "voice", "music", "sound", "tts"],
  infra: ["host", "cloud", "db", "auth", "deploy", "backend"],
  inspiration: ["mood", "inspo", "gallery", "dribbble", "arena"],
};

export function looksLikeUrl(value: string) {
  return /^(https?:\/\/|www\.)/i.test(value.trim()) || /^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(value.trim());
}

export function normalizeUrl(value: string) {
  const trimmed = value.trim().replace(/[),.;]+$/g, "");
  if (/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(trimmed) && !trimmed.includes(".")) {
    return `https://github.com/${trimmed}`;
  }
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export function extractDroppedUrl(data: DataTransfer) {
  const uriList = data.getData("text/uri-list");
  const fromList = uriList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
  if (fromList && looksLikeUrl(fromList)) return normalizeUrl(fromList);

  const html = data.getData("text/html");
  const href = html.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
  if (href && looksLikeUrl(href)) return normalizeUrl(href);

  const text = data.getData("text/plain").trim();
  return extractUrlFromText(text);
}

export function extractUrlFromText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(trimmed) && !trimmed.includes(".")) {
    return normalizeUrl(trimmed);
  }
  const match = trimmed.match(/https?:\/\/[^\s<>"']+/i) ?? trimmed.match(/\b(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<>"']*)?/i);
  if (!match) return null;
  return normalizeUrl(match[0]);
}

const COMMAND_RE = /(?:^|[`$]|\b)((?:npx|pnpm\s+dlx|yarn\s+dlx|bunx|npm\s+(?:i|install|exec)|pnpm\s+(?:add|dlx)|yarn\s+add|bun\s+(?:add|x)|uvx|pipx|pip\s+install)\s+[^\n;`]+)/i;

export function looksLikeCommand(value: string) {
  const trimmed = value.trim().replace(/^[`$]+\s*/, "");
  return Boolean(COMMAND_RE.test(trimmed) || /^(npx|pnpm|yarn|bunx|npm|uvx|pipx|pip)\b/i.test(trimmed));
}

export function extractCommandFromText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = trimmed.match(COMMAND_RE);
  if (match?.[1]) return match[1].trim().replace(/[`]+$/g, "");
  if (looksLikeCommand(trimmed) && !looksLikeUrl(trimmed)) {
    return trimmed.replace(/^[`$]+\s*/, "").replace(/[`]+$/g, "");
  }
  return null;
}

function packageFromCommand(command: string) {
  const parts = command.trim().split(/\s+/);
  const skip = new Set(["npx", "pnpm", "yarn", "bunx", "npm", "uvx", "pipx", "pip", "dlx", "exec", "add", "install", "i", "x", "-y", "--yes"]);
  for (const part of parts) {
    if (!part || part.startsWith("-") || skip.has(part.toLowerCase())) continue;
    return part.replace(/^@/, "").split("/")[0] || part;
  }
  return command;
}

export function guessFromCommand(command: string): ToolDraft {
  const pkg = packageFromCommand(command);
  const name = pkg.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return {
    name,
    url: command,
    description: `Install with ${command}`,
    category: "agent",
    kind: "agent",
    status: "watching",
    tags: ["plugin", "agent", "cli"],
    source: "other",
    command,
    guessed: ["name", "url", "description", "category", "kind", "tags", "command"],
  };
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function titleFromHost(host: string) {
  const base = host.split(".")[0] ?? host;
  if (!base) return "Untitled tool";
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function guessCategoryFromText(text: string, fallback: string) {
  const hay = text.toLowerCase();
  let best = fallback;
  let score = 0;
  for (const [category, words] of Object.entries(CATEGORY_WORDS)) {
    const hits = words.filter((word) => hay.includes(word)).length;
    if (hits > score) {
      best = category;
      score = hits;
    }
  }
  return best;
}

export function guessFromUrl(url: string): ToolDraft {
  const normalized = normalizeUrl(url);
  const repo = parseGithubRepo(normalized);
  const host = hostOf(normalized);
  const hint = HOST_HINTS[host];
  const guessed: string[] = ["url"];

  if (repo) {
    const mine = repo.owner.toLowerCase() === "mpotter2002";
    guessed.push("name", "category", "kind", "tags", "repo");
    return {
      name: repo.name.replace(/[-_]+/g, " "),
      url: normalized,
      description: "",
      category: mine ? "infra" : "github",
      kind: "agent",
      status: mine ? "using" : "watching",
      tags: mine ? ["mine", "github", repo.owner] : ["github", repo.owner],
      source: mine ? "mine" : "github",
      repo: repo.full,
      guessed,
    };
  }

  const name = hint?.name ?? titleFromHost(host);
  const category = hint?.category ?? guessCategoryFromText(`${host} ${normalized}`, "ui");
  const kind = hint?.kind ?? (category === "ides" ? "ide" : category === "github" ? "agent" : "design");
  guessed.push("name", "category", "kind");
  return {
    name,
    url: normalized,
    description: "",
    category,
    kind,
    status: "watching",
    tags: hint?.tags ?? [host.split(".")[0] ?? "tool"],
    source: host.includes("twitter") || host === "x.com" ? "twitter" : "other",
    guessed,
  };
}

export function applyLookup(draft: ToolDraft, lookup: Partial<ToolDraft>): ToolDraft {
  const next = { ...draft, tags: [...draft.tags] };
  const guessed = new Set(draft.guessed);

  if (lookup.name && (!draft.name || draft.guessed.includes("name"))) {
    const marketing = lookup.name.toLowerCase().startsWith(draft.name.toLowerCase()) && lookup.name.length > draft.name.length + 2;
    if (!draft.name || !marketing) {
      next.name = lookup.name;
    }
    guessed.add("name");
  }
  if (lookup.description && (!draft.description || draft.guessed.includes("description"))) {
    next.description = lookup.description;
    guessed.add("description");
  }
  if (lookup.category && (!draft.category || draft.guessed.includes("category"))) {
    next.category = lookup.category;
    guessed.add("category");
  }
  if (lookup.kind && (!draft.kind || draft.guessed.includes("kind"))) {
    next.kind = lookup.kind;
    guessed.add("kind");
  }
  if (lookup.tags?.length) {
    next.tags = Array.from(new Set([...next.tags, ...lookup.tags]));
    guessed.add("tags");
  }
  if (lookup.repo) next.repo = lookup.repo;
  next.guessed = Array.from(guessed);
  return next;
}

export function draftToId(draft: ToolDraft) {
  return draft.repo?.replace("/", "-") || slugify(draft.name) || slugify(draft.url);
}


export type InspoDraft = {
  name: string;
  url: string;
  description: string;
  kind: InspoKind;
  tags: string[];
  guessed: string[];
};

const PERSON_HOSTS = new Set([
  "x.com",
  "twitter.com",
  "instagram.com",
  "linkedin.com",
  "layers.to",
  "read.cv",
  "bsky.app",
]);

export function guessInspoFromUrl(url: string): InspoDraft {
  const tool = guessFromUrl(url);
  const host = (() => {
    try {
      return new URL(tool.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  const path = (() => {
    try {
      return new URL(tool.url).pathname;
    } catch {
      return "";
    }
  })();
  const looksPerson =
    PERSON_HOSTS.has(host) ||
    (path.split("/").filter(Boolean).length === 1 && host.endsWith(".me")) ||
    ["read.cv", "bsky.app"].includes(host) ||
    ["portfolio", "studio"].some((word) => host.includes(word) || path.includes(word));

  return {
    name: tool.name,
    url: tool.url,
    description: tool.description,
    kind: looksPerson ? "person" : "site",
    tags: Array.from(new Set([looksPerson ? "person" : "site", ...tool.tags.filter((tag) => tag !== "github")])),
    guessed: ["url", "name", "kind"],
  };
}

export function applyInspoLookup(draft: InspoDraft, lookup: Partial<InspoDraft>): InspoDraft {
  const next = { ...draft, tags: [...draft.tags] };
  const guessed = new Set(draft.guessed);
  if (lookup.name && (!draft.name || draft.guessed.includes("name"))) {
    const marketing = lookup.name.toLowerCase().startsWith(draft.name.toLowerCase()) && lookup.name.length > draft.name.length + 2;
    if (!draft.name || !marketing) next.name = lookup.name;
    guessed.add("name");
  }
  if (lookup.description && (!draft.description || draft.guessed.includes("description"))) {
    next.description = lookup.description;
    guessed.add("description");
  }
  if (lookup.kind && draft.guessed.includes("kind")) {
    next.kind = lookup.kind;
    guessed.add("kind");
  }
  if (lookup.tags?.length) {
    next.tags = Array.from(new Set([...next.tags, ...lookup.tags]));
    guessed.add("tags");
  }
  next.guessed = Array.from(guessed);
  return next;
}

export type SkillDraft = {
  name: string;
  url: string;
  description: string;
  format: SkillFormat;
  tags: string[];
  file?: string;
  guessed: string[];
};

function fileFromUrl(url: string) {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").filter(Boolean).at(-1) ?? "";
    if (last.includes(".")) return last;
    return undefined;
  } catch {
    return undefined;
  }
}

export function guessSkillFromUrl(url: string): SkillDraft {
  const tool = guessFromUrl(url);
  const file = fileFromUrl(tool.url);
  const format = guessSkillFormat(tool.url, file);
  const tags = Array.from(new Set(["skill", format, ...tool.tags.filter((tag) => tag !== "github")]));
  return {
    name: tool.name,
    url: tool.url,
    description: tool.description,
    format,
    tags,
    file,
    guessed: ["url", "name", "format"],
  };
}

export function applySkillLookup(draft: SkillDraft, lookup: Partial<SkillDraft>): SkillDraft {
  const next = { ...draft, tags: [...draft.tags] };
  const guessed = new Set(draft.guessed);
  if (lookup.name && (!draft.name || draft.guessed.includes("name"))) {
    const marketing = lookup.name.toLowerCase().startsWith(draft.name.toLowerCase()) && lookup.name.length > draft.name.length + 2;
    if (!draft.name || !marketing) next.name = lookup.name;
    guessed.add("name");
  }
  if (lookup.description && (!draft.description || draft.guessed.includes("description"))) {
    next.description = lookup.description;
    guessed.add("description");
  }
  if (lookup.format && draft.guessed.includes("format")) {
    next.format = lookup.format;
    guessed.add("format");
  }
  if (lookup.tags?.length) {
    next.tags = Array.from(new Set([...next.tags, ...lookup.tags]));
    guessed.add("tags");
  }
  if (lookup.file) next.file = lookup.file;
  next.guessed = Array.from(guessed);
  return next;
}
