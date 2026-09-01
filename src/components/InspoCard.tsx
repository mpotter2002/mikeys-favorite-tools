import type { Inspo } from "@/lib/types";
import { faviconUrl, hostname } from "@/lib/search";

export function InspoCard({ item, onOpen }: { item: Inspo; onOpen: (item: Inspo) => void }) {
  return (
    <button type="button" onClick={() => onOpen(item)} className={`group card inspo ${item.kind}`}>
      <div className="card-top">
        <img src={faviconUrl(item.url)} alt="" width={32} height={32} className="favicon" />
        <span className="pill">{item.kind === "person" ? "Person" : "Site"}</span>
      </div>
      <h3>{item.name}</h3>
      <p className="desc">{item.description}</p>
      <div className="meta">
        <span className="host">{hostname(item.url)}</span>
        <span className="kind">{item.kind}</span>
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
