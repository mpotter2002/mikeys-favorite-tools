export type ToolKind = string;

export type ToolStatus = string;

export type ToolSource = "browser" | "twitter" | "mind" | "github" | "mine" | "other";

export type Lane = "tools" | "stack" | "inspo" | "mine" | "skills";

export type Tool = {
  id: string;
  name: string;
  url: string;
  description: string;
  category: string;
  categories?: string[];
  tags: string[];
  kind: ToolKind;
  status: ToolStatus;
  notes?: string;
  source?: ToolSource;
  repo?: string;
  lanes?: Lane[];
  subcategory?: string;
  subcategories?: string[];
};

export type InboxTool = Tool & {
  addedAt: string;
};

export type InspoKind = "site" | "person";

export type Inspo = {
  id: string;
  name: string;
  url: string;
  description: string;
  kind: InspoKind;
  tags: string[];
  notes?: string;
  lanes?: Lane[];
};

export type InboxInspo = Inspo & {
  addedAt: string;
};

export type Category = {
  id: string;
  label: string;
  description?: string;
};

export type Option = {
  id: string;
  label: string;
};

export const CATEGORIES: Category[] = [
  { id: "all", label: "All" },
  { id: "ides", label: "IDEs", description: "Editors and coding environments." },
  { id: "github", label: "GitHub", description: "Repos, frameworks, and starters." },
  { id: "image", label: "Image", description: "Still image generation and art tools." },
  { id: "video", label: "Video", description: "Motion, clips, and video models." },
  { id: "ui", label: "UI & Design", description: "Interface, type, color, and product design." },
  { id: "prototype", label: "Prototype", description: "Canvases, 3D, motion, and quick builds." },
  { id: "research", label: "Research", description: "Search, notes, and reference." },
  { id: "audio", label: "Audio", description: "Voice, music, and sound." },
  { id: "infra", label: "Infra", description: "Hosting, data, and glue." },
];

export const INSPO_KINDS: { id: InspoKind | "all"; label: string }[] = [
  { id: "all", label: "All inspo" },
  { id: "site", label: "Sites" },
  { id: "person", label: "People" },
];

export const STATUSES: Option[] = [
  { id: "using", label: "Using" },
  { id: "watching", label: "Watching" },
  { id: "maybe", label: "Maybe" },
  { id: "archive", label: "Archive" },
];

export const KINDS: Option[] = [
  { id: "all", label: "Everything" },
  { id: "design", label: "Design" },
  { id: "agent", label: "Agent" },
  { id: "ide", label: "IDE" },
  { id: "both", label: "Both" },
];

export type SkillFormat = "markdown" | "yaml" | "json" | "config" | "pack";

export type Skill = {
  id: string;
  name: string;
  url: string;
  description: string;
  format: SkillFormat;
  tags: string[];
  notes?: string;
  file?: string;
  lanes?: Lane[];
};

export type InboxSkill = Skill & {
  addedAt: string;
};

export const SKILL_FORMATS: { id: SkillFormat | "all"; label: string; description?: string }[] = [
  { id: "all", label: "All", description: "Markdown, YAML, JSON, configs, and whole skill packs." },
  { id: "markdown", label: "Markdown", description: "SKILL.md, AGENTS.md, DESIGN.md, and other instruction files." },
  { id: "yaml", label: "YAML", description: "Agent configs, workflows, and skill manifests." },
  { id: "json", label: "JSON", description: "Machine-readable skill and tool configs." },
  { id: "config", label: "Config", description: "TOML, XML, and other non-markdown skill files." },
  { id: "pack", label: "Packs", description: "Repos and folders of skills, not just one file." },
];
