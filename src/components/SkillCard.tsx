import type { Skill } from "@/lib/types";
import { faviconUrl, hostname, skillFormatLabel } from "@/lib/search";

export function SkillCard({ item, onOpen }: { item: Skill; onOpen: (item: Skill) => void }) {
  return (
    <button type="button" onClick={() => onOpen(item)} className={`group card skill ${item.format}`}>
      <div className="card-top">
        <img src={faviconUrl(item.url)} alt="" width={32} height={32} className="favicon" />
        <span className="pill github-pill">{skillFormatLabel(item.format)}</span>
      </div>
      <h3>{item.name}</h3>
      <p className="desc">{item.description}</p>
      <div className="meta">
        <span className="host">{item.file || hostname(item.url)}</span>
        <span className="kind">{item.format}</span>
      </div>
      {item.tags.length > 0 ? (
        <ul className="tags">
          {item.tags.slice(0, 4).map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}
    </button>
  );
}
