import type { Tool } from "@/lib/types";
import { faviconUrl, hostname, isCommandValue, isMineTool, parseGithubRepo } from "@/lib/search";

function pretty(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function ToolCard({ tool, onOpen }: { tool: Tool; onOpen: (tool: Tool) => void }) {
  const repo = parseGithubRepo(tool.url) ?? (tool.repo ? parseGithubRepo(`https://github.com/${tool.repo}`) : null);
  const command = tool.command || (isCommandValue(tool.url) ? tool.url : "");
  const hostLabel = command || (repo ? repo.full : hostname(tool.url));
  const mine = isMineTool(tool);

  return (
    <button
      type="button"
      onClick={() => onOpen(tool)}
      className={mine ? "group card mine" : repo ? "group card github" : "group card"}
    >
      <div className="card-top">
        <img
          src={faviconUrl(tool.url, repo)}
          alt=""
          width={32}
          height={32}
          className="favicon"
        />
        <div className="badges">
          {mine ? <span className="pill github-pill">Built by Mikey</span> : null}
          {command ? <span className="pill github-pill">Plugin</span> : null}
          {repo && !mine && !command ? <span className="pill github-pill">GitHub</span> : null}
          <span className={`pill status-${tool.status}`}>{pretty(tool.status)}</span>
        </div>
      </div>
      <h3>{tool.name}</h3>
      <p className="desc">{tool.description}</p>
      <div className="meta">
        <span className="host">{hostLabel}</span>
        <span className="kind">{tool.kind}</span>
      </div>
      {tool.tags.length > 0 ? (
        <ul className="tags">
          {tool.tags.slice(0, 4).map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}
    </button>
  );
}
