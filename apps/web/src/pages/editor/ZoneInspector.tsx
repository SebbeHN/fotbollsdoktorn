import { useEffect, useState } from "react";
import { useDeleteZone, useUpdateZone } from "../../api/hooks";
import type { SetPieceZone } from "../../api/types";

interface ZoneInspectorProps {
  zone: SetPieceZone;
  variantId: string;
  onDeleted: () => void;
}

const PRESET_COLORS = ["#38bdf8", "#facc15", "#f87171", "#4ade80", "#c084fc", "#f97316"];

export function ZoneInspector({ zone, variantId, onDeleted }: ZoneInspectorProps) {
  const updateZone = useUpdateZone(variantId);
  const deleteZone = useDeleteZone(variantId);
  const [name, setName] = useState(zone.name);

  useEffect(() => setName(zone.name), [zone.id]);

  function handleRename() {
    if (name.trim() && name.trim() !== zone.name) {
      updateZone.mutate({ id: zone.id, data: { name: name.trim() } });
    }
  }

  return (
    <div className="w-80 flex-shrink-0 space-y-4 border-l border-surface-border bg-surface-raised p-5">
      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Zonnamn</div>
        <input
          className="input w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </div>

      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Färg</div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => updateZone.mutate({ id: zone.id, data: { color: c } })}
              className={`h-6 w-6 rounded-full border-2 ${
                zone.color === c ? "border-white" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Dra zonen på planen för att flytta den, eller dra gula hörnhandtaget för att ändra storlek.
      </p>

      <button
        onClick={() => {
          if (confirm(`Ta bort zonen "${zone.name}"?`)) {
            deleteZone.mutate(zone.id, { onSuccess: onDeleted });
          }
        }}
        className="text-xs text-slate-500 hover:text-red-400"
      >
        Ta bort zon
      </button>
    </div>
  );
}
