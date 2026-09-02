import type { Lane } from "@/lib/types";
import { LANE_OPTIONS, toggleLane } from "@/lib/lanes";

export function LanePicks({
  value,
  onChange,
}: {
  value: Lane[];
  onChange: (lanes: Lane[]) => void;
}) {
  return (
    <fieldset className="lane-picks span-2">
      <legend>Show in</legend>
      <div className="lane-pick-row wrap">
        {LANE_OPTIONS.map((item) => (
          <label key={item.id} className={value.includes(item.id) ? "on" : undefined}>
            <input
              type="checkbox"
              checked={value.includes(item.id)}
              onChange={() => onChange(toggleLane(value, item.id))}
            />
            {item.label}
          </label>
        ))}
      </div>
      <p className="hint">Optional — a card can live in more than one place, or only appear in All.</p>
    </fieldset>
  );
}
