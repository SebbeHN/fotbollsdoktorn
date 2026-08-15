import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../state/appStore";
import {
  useCreateSetPiece,
  useCreateVariant,
  useDeleteVariant,
  useDuplicateVariant,
  useSetPieceCategories,
} from "../../api/hooks";
import type { SetPieceCategory } from "../../api/types";

export function SetPieceLibrary() {
  const teamId = useAppStore((s) => s.currentTeamId);
  const { data: categories, isLoading } = useSetPieceCategories(teamId ?? undefined);

  const roots = (categories ?? []).filter((c) => !c.parentId);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold text-white">Fasta situationer</h1>
      <p className="mt-1 text-sm text-slate-400">Bibliotek över offensiva och defensiva situationer.</p>

      {isLoading && <div className="mt-8 text-slate-500">Laddar...</div>}

      <div className="mt-6 space-y-6">
        {roots.map((root) => (
          <CategoryNode key={root.id} category={root} allCategories={categories ?? []} depth={0} />
        ))}
      </div>
    </div>
  );
}

function CategoryNode({
  category,
  allCategories,
  depth,
}: {
  category: SetPieceCategory;
  allCategories: SetPieceCategory[];
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const children = allCategories.filter((c) => c.parentId === category.id);
  const teamId = useAppStore((s) => s.currentTeamId);
  const createSetPiece = useCreateSetPiece(teamId ?? undefined, category.id);
  const [newSetPieceName, setNewSetPieceName] = useState("");
  const [addingSetPiece, setAddingSetPiece] = useState(false);

  return (
    <div
      className={
        depth === 0
          ? "rounded-lg border border-surface-border bg-surface-raised"
          : "border-t border-surface-border pt-3"
      }
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-medium text-white">
          {category.name}{" "}
          <span className="ml-2 text-xs uppercase tracking-wide text-slate-500">{category.type}</span>
        </span>
        <span className="text-slate-500">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          {children.map((child) => (
            <CategoryNode key={child.id} category={child} allCategories={allCategories} depth={depth + 1} />
          ))}

          {category.setPieces?.map((sp) => (
            <SetPieceRow key={sp.id} setPieceId={sp.id} name={sp.name} variants={sp.variants} />
          ))}

          {children.length === 0 && (
            <div className="flex items-center gap-2 pt-1">
              {addingSetPiece ? (
                <>
                  <input
                    autoFocus
                    className="input max-w-xs"
                    placeholder="Namn på ny situation..."
                    value={newSetPieceName}
                    onChange={(e) => setNewSetPieceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSetPieceName.trim()) {
                        createSetPiece.mutate(
                          { name: newSetPieceName, type: category.type },
                          { onSuccess: () => setAddingSetPiece(false) }
                        );
                        setNewSetPieceName("");
                      }
                    }}
                  />
                  <button
                    className="text-xs text-accent"
                    onClick={() => {
                      if (!newSetPieceName.trim()) return;
                      createSetPiece.mutate(
                        { name: newSetPieceName, type: category.type },
                        { onSuccess: () => setAddingSetPiece(false) }
                      );
                      setNewSetPieceName("");
                    }}
                  >
                    Spara
                  </button>
                  <button className="text-xs text-slate-500" onClick={() => setAddingSetPiece(false)}>
                    Avbryt
                  </button>
                </>
              ) : (
                <button
                  className="text-xs text-slate-400 hover:text-accent"
                  onClick={() => setAddingSetPiece(true)}
                >
                  + Ny situation
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SetPieceRow({
  setPieceId,
  name,
  variants,
}: {
  setPieceId: string;
  name: string;
  variants: { id: string; name: string; isActive: boolean }[];
}) {
  const navigate = useNavigate();
  const teamId = useAppStore((s) => s.currentTeamId);
  const createVariant = useCreateVariant(teamId ?? undefined, setPieceId);
  const duplicateVariant = useDuplicateVariant(teamId ?? undefined);
  const deleteVariant = useDeleteVariant(teamId ?? undefined);
  const [newVariantName, setNewVariantName] = useState("");
  const [adding, setAdding] = useState(false);

  return (
    <div className="rounded-md border border-surface-border/60 bg-surface p-3">
      <div className="font-medium text-slate-200">{name}</div>
      <ul className="mt-2 space-y-1">
        {variants.map((v) => (
          <li key={v.id} className="flex items-center justify-between text-sm">
            <button
              onClick={() => navigate(`/fasta-situationer/variant/${v.id}`)}
              className={`hover:text-accent ${v.isActive ? "text-slate-200" : "text-slate-500 line-through"}`}
            >
              {v.name}
            </button>
            <div className="flex gap-3 text-xs text-slate-500">
              <button
                className="hover:text-accent"
                onClick={() => {
                  const dupName = prompt("Namn på kopian:", `${v.name} (kopia)`);
                  if (dupName) duplicateVariant.mutate({ variantId: v.id, name: dupName });
                }}
              >
                Duplicera
              </button>
              <button
                className="hover:text-red-400"
                onClick={() => {
                  if (confirm(`Ta bort variant "${v.name}"?`)) deleteVariant.mutate(v.id);
                }}
              >
                Ta bort
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center gap-2">
        {adding ? (
          <>
            <input
              autoFocus
              className="input max-w-xs"
              placeholder="Namn på ny variant..."
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
            />
            <button
              className="text-xs text-accent"
              onClick={() => {
                if (!newVariantName.trim()) return;
                createVariant.mutate(
                  { name: newVariantName },
                  {
                    onSuccess: (variant) => {
                      setAdding(false);
                      setNewVariantName("");
                      if (variant?.id) navigate(`/fasta-situationer/variant/${variant.id}`);
                    },
                  }
                );
              }}
            >
              Spara
            </button>
            <button className="text-xs text-slate-500" onClick={() => setAdding(false)}>
              Avbryt
            </button>
          </>
        ) : (
          <button className="text-xs text-slate-400 hover:text-accent" onClick={() => setAdding(true)}>
            + Ny variant
          </button>
        )}
      </div>
    </div>
  );
}
