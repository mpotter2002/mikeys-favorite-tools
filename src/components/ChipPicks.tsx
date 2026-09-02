"use client";

import { useEffect, useRef, useState } from "react";

export function ChipPicks({
  legend,
  hint,
  options,
  value,
  onChange,
  wrap = false,
  single = false,
  onAdd,
  onRemove,
  removableIds,
  addLabel = "Add",
}: {
  legend: string;
  hint?: string;
  options: { id: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  wrap?: boolean;
  single?: boolean;
  onAdd?: (label: string) => void;
  onRemove?: (id: string) => void;
  removableIds?: string[];
  addLabel?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!adding) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [adding]);

  function toggle(id: string) {
    if (single) {
      onChange([id]);
      return;
    }
    const next = value.includes(id) ? value.filter((item) => item !== id) : [...value, id];
    if (!next.length) return;
    onChange(next);
  }

  function submitAdd() {
    const label = draft.trim();
    if (label) onAdd?.(label);
    setDraft("");
    setAdding(false);
  }

  return (
    <fieldset className={`lane-picks span-2 ${wrap ? "wrap" : ""}`}>
      <legend>{legend}</legend>
      <div className={wrap ? "lane-pick-row wrap" : "lane-pick-row"}>
        {options.map((item) => {
          const removable = Boolean(onRemove && (!removableIds || removableIds.includes(item.id)));

          return (
          <label key={item.id} className={`${value.includes(item.id) ? "on" : ""} ${removable ? "has-x" : ""}`.trim()}>
            <input type="checkbox" checked={value.includes(item.id)} onChange={() => toggle(item.id)} />
            <span>{item.label}</span>
            {removable ? (
              <button
                type="button"
                className="chip-x"
                aria-label={`Delete ${item.label}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRemove?.(item.id);
                }}
              >
                ×
              </button>
            ) : null}
          </label>
          );
        })}
        {onAdd ? (
          adding ? (
            <div className="chip-add">
              <input
                ref={inputRef}
                className="chip-add-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={submitAdd}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    submitAdd();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setDraft("");
                    setAdding(false);
                  }
                }}
                placeholder={addLabel}
                aria-label={addLabel}
              />
            </div>
          ) : (
            <button
              type="button"
              className="chip-plus"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setAdding(true)}
              aria-label={addLabel}
            >
              +
            </button>
          )
        ) : null}
      </div>
      {hint ? <p className="hint">{hint}</p> : null}
    </fieldset>
  );
}
