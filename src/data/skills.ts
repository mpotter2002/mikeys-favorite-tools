import type { Skill } from "@/lib/types";

export const skills: Skill[] = [
  {
    id: "design-md",
    name: "DESIGN.md",
    url: "https://github.com/google-labs-code/design.md",
    description: "A markdown format for giving coding agents a persistent visual identity.",
    format: "markdown",
    tags: ["design-system", "agents", "spec"],
    file: "DESIGN.md",
    lanes: ["tools", "skills"],
  },
  {
    id: "interface-skills",
    name: "Interface Skills",
    url: "https://github.com/jakubkrehel/skills",
    description: "A pack of agent skills for building a great interface.",
    format: "pack",
    tags: ["ui", "agents", "skills"],
    lanes: ["tools", "skills"],
  },
  {
    id: "agents-md",
    name: "AGENTS.md",
    url: "https://agents.md",
    description: "A simple markdown file for telling coding agents how to work in a repo.",
    format: "markdown",
    tags: ["agents", "repo", "instructions"],
    file: "AGENTS.md",
  },
  {
    id: "claude-skills",
    name: "Claude Skills",
    url: "https://github.com/anthropics/skills",
    description: "Official Claude skill packs. Usually SKILL.md plus optional scripts and configs.",
    format: "pack",
    tags: ["claude", "skills", "agents"],
  },
  {
    id: "skill-md",
    name: "SKILL.md",
    url: "https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview",
    description: "The usual skill file: markdown instructions an agent can load for a task.",
    format: "markdown",
    tags: ["claude", "markdown", "instructions"],
    file: "SKILL.md",
  },
];
