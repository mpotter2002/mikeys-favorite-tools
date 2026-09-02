import type { Inspo, Lane, Skill, Tool } from "@/lib/types";
import { guessSkillFormat, parseGithubRepo } from "@/lib/search";

export const LANE_OPTIONS: { id: Lane; label: string }[] = [
  { id: "tools", label: "Tools and resources" },
  { id: "stack", label: "Current stack" },
  { id: "mine", label: "Built by Mikey" },
  { id: "skills", label: "AI / Agents" },
  { id: "inspo", label: "Inspo" },
];

export function uniqueLanes(lanes: Lane[]): Lane[] {
  return LANE_OPTIONS.map((item) => item.id).filter((id) => lanes.includes(id));
}

export function isMineLike(tool: Pick<Tool, "source" | "tags">) {
  return tool.source === "mine" || tool.tags.includes("mine") || tool.tags.includes("made-by-me");
}

export function lanesOfTool(tool: Pick<Tool, "source" | "tags" | "lanes">): Lane[] {
  if (tool.lanes) return uniqueLanes(tool.lanes);
  return isMineLike(tool) ? ["mine"] : ["tools"];
}

export function lanesOfSkill(item: Pick<Skill, "lanes">): Lane[] {
  return item.lanes ? uniqueLanes(item.lanes) : ["skills"];
}

export function lanesOfInspo(item: Pick<Inspo, "lanes">): Lane[] {
  return item.lanes ? uniqueLanes(item.lanes) : ["inspo"];
}

export function toggleLane(current: Lane[], id: Lane): Lane[] {
  const next = current.includes(id) ? current.filter((lane) => lane !== id) : [...current, id];
  return uniqueLanes(next);
}

export function toolToSkill(tool: Tool): Skill {
  return {
    id: tool.id,
    name: tool.name,
    url: tool.url,
    description: tool.description,
    format: guessSkillFormat(tool.url),
    tags: Array.from(new Set([...tool.tags, "skill"])),
    notes: tool.notes,
    lanes: lanesOfTool(tool),
  };
}

export function skillToTool(skill: Skill): Tool {
  const repo = parseGithubRepo(skill.url);
  return {
    id: skill.id,
    name: skill.name,
    url: skill.url,
    description: skill.description,
    category: repo ? "github" : "research",
    tags: skill.tags,
    kind: "both",
    status: "watching",
    source: repo ? "github" : "other",
    repo: repo?.full,
    notes: skill.notes,
    lanes: lanesOfSkill(skill),
  };
}

export function toolToInspo(tool: Tool): Inspo {
  return {
    id: tool.id,
    name: tool.name,
    url: tool.url,
    description: tool.description,
    kind: "site",
    tags: tool.tags,
    notes: tool.notes,
    lanes: lanesOfTool(tool),
  };
}

export function skillToInspo(skill: Skill): Inspo {
  return {
    id: skill.id,
    name: skill.name,
    url: skill.url,
    description: skill.description,
    kind: "site",
    tags: skill.tags,
    notes: skill.notes,
    lanes: lanesOfSkill(skill),
  };
}

export function inspoToTool(item: Inspo): Tool {
  return {
    id: item.id,
    name: item.name,
    url: item.url,
    description: item.description,
    category: "ui",
    tags: item.tags,
    kind: "design",
    status: "watching",
    source: "other",
    notes: item.notes,
    lanes: lanesOfInspo(item),
  };
}

export function inspoToSkill(item: Inspo): Skill {
  return {
    id: item.id,
    name: item.name,
    url: item.url,
    description: item.description,
    format: guessSkillFormat(item.url),
    tags: Array.from(new Set([...item.tags, "skill"])),
    notes: item.notes,
    lanes: lanesOfInspo(item),
  };
}

export function mergeByUrl<T extends { id: string; url: string }>(primary: T[], extra: T[]): T[] {
  const seenIds = new Set(primary.map((item) => item.id));
  const seenUrls = new Set(primary.map((item) => item.url));
  return [...primary, ...extra.filter((item) => !seenIds.has(item.id) && !seenUrls.has(item.url))];
}
