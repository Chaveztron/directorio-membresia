"use client";

import {
  BookHeart,
  KeyRound,
  ListPlus,
  LogIn,
  LogOut,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createPrayer,
  deletePrayer,
  isPrayerStorageConfigured,
  listPrayers,
  signInPrayerAdmin,
  updatePrayer,
} from "@/lib/prayers";
import type { Prayer, PrayerAdminSession } from "@/lib/prayers";

type ContactReference = {
  id: string;
  nombre: string;
};

type PrayerDraft = {
  key: string;
  id?: string;
  text: string;
  createdAt?: string;
};

type PrayerManagerDialogProps = {
  open: boolean;
  mode: "view" | "add";
  contact: ContactReference | null;
  session: PrayerAdminSession | null;
  prayers: Prayer[] | null;
  onOpenChange: (open: boolean) => void;
  onSessionChange: (session: PrayerAdminSession | null) => void;
  onPrayersChange: (prayers: Prayer[] | null) => void;
};

function createDraft(): PrayerDraft {
  return {
    key: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    text: "",
  };
}

function createDrafts(
  contact: ContactReference | null,
  prayers: Prayer[] | null,
  mode: "view" | "add",
  session: PrayerAdminSession | null,
) {
  if (!contact || !prayers || !session) return [];

  const drafts: PrayerDraft[] = prayers
    .filter((prayer) => prayer.contactId === contact.id)
    .map((prayer) => ({
      key: prayer.id,
      id: prayer.id,
      text: prayer.text,
      createdAt: prayer.createdAt,
    }));

  if (mode === "add") drafts.push(createDraft());
  return drafts;
}

function formatDate(value?: string) {
  if (!value) return "Nueva";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function PrayerManagerDialog({
  open,
  mode,
  contact,
  session,
  prayers,
  onOpenChange,
  onSessionChange,
  onPrayersChange,
}: PrayerManagerDialogProps) {
  const [adminPassword, setAdminPassword] = useState("");
  const [drafts, setDrafts] = useState<PrayerDraft[]>(() =>
    createDrafts(contact, prayers, mode, session)
  );
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const contactPrayers = useMemo(
    () => contact && prayers
      ? prayers.filter((prayer) => prayer.contactId === contact.id)
      : [],
    [contact, prayers],
  );

  const originalById = useMemo(
    () => new Map(contactPrayers.map((prayer) => [prayer.id, prayer])),
    [contactPrayers],
  );

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminPassword.trim()) return;

    setIsWorking(true);
    setError("");
    try {
      const nextSession = await signInPrayerAdmin(adminPassword);
      const nextPrayers = await listPrayers(nextSession.idToken);
      onSessionChange(nextSession);
      onPrayersChange(nextPrayers);
      setAdminPassword("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible iniciar sesión.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  function updateDraft(key: string, text: string) {
    setDrafts((current) => current.map((draft) =>
      draft.key === key ? { ...draft, text } : draft
    ));
    setSuccess("");
  }

  function removeDraft(draft: PrayerDraft) {
    setDrafts((current) => current.filter((item) => item.key !== draft.key));
    if (draft.id) {
      setDeletedIds((current) =>
        current.includes(draft.id!) ? current : [...current, draft.id!]
      );
    }
    setSuccess("");
  }

  function addDraft() {
    setDrafts((current) => [...current, createDraft()]);
    setSuccess("");
  }

  const hasEmptySavedPrayer = drafts.some(
    (draft) => draft.id && !draft.text.trim(),
  );
  const hasChanges = deletedIds.length > 0 || drafts.some((draft) => {
    const text = draft.text.trim();
    if (!draft.id) return Boolean(text);
    return originalById.get(draft.id)?.text !== text;
  });

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact || !session || !hasChanges) return;

    if (hasEmptySavedPrayer) {
      setError("Una oración existente no puede quedar vacía. Escríbela o elimínala.");
      return;
    }

    if (Date.now() >= session.expiresAt - 30_000) {
      onSessionChange(null);
      onPrayersChange(null);
      setError("La sesión administrativa venció. Inicia sesión nuevamente.");
      return;
    }

    setIsWorking(true);
    setError("");
    setSuccess("");

    try {
      const operations: Promise<unknown>[] = deletedIds.map((id) =>
        deletePrayer(session.idToken, id)
      );

      for (const draft of drafts) {
        const text = draft.text.trim();
        if (!text) continue;

        if (!draft.id) {
          operations.push(createPrayer(session.idToken, contact.id, text));
          continue;
        }

        const original = originalById.get(draft.id);
        if (original && original.text !== text) {
          operations.push(updatePrayer(session.idToken, original, text));
        }
      }

      await Promise.all(operations);
      const nextPrayers = await listPrayers(session.idToken);
      onPrayersChange(nextPrayers);
      setDrafts(createDrafts(contact, nextPrayers, "view", session));
      setDeletedIds([]);
      setSuccess("Las oraciones se guardaron correctamente.");
    } catch (reason) {
      const message = reason instanceof Error
        ? reason.message
        : "No fue posible guardar los cambios.";
      setError(message);

      if (/sesión administrativa venció/i.test(message)) {
        onSessionChange(null);
        onPrayersChange(null);
      }
    } finally {
      setIsWorking(false);
    }
  }

  function logout() {
    onSessionChange(null);
    onPrayersChange(null);
    setDrafts([]);
    setDeletedIds([]);
    setSuccess("");
    setError("");
  }

  const title = contact ? `Oraciones de ${contact.nombre}` : "Oraciones";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden rounded-2xl border-base-300 bg-base-100 p-0 shadow-2xl sm:max-w-2xl">
        {!session ? (
          <form onSubmit={login}>
            <DialogHeader className="border-b border-base-300 p-5 pb-4">
              <div className="mb-1 grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound aria-hidden="true" className="size-5" />
              </div>
              <DialogTitle className="text-xl">Acceso administrativo</DialogTitle>
              <DialogDescription className="text-base-content/60">
                Inicia sesión para consultar y administrar las oraciones de {contact?.nombre ?? "este contacto"}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 p-5">
              {!isPrayerStorageConfigured && (
                <div className="rounded-xl border border-warning/35 bg-warning/10 p-3 text-sm text-warning-content" role="alert">
                  Firebase aún no está configurado. Agrega las tres variables indicadas en <code>.env.example</code>.
                </div>
              )}

              <label htmlFor="prayer-admin-password" className="label font-semibold">
                Contraseña del administrador
              </label>
              <Input
                id="prayer-admin-password"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                className="input input-bordered h-10 w-full rounded-lg bg-base-100 px-3 text-sm focus:border-primary"
                placeholder="Escribe la contraseña administrativa"
                aria-invalid={Boolean(error)}
              />

              {error && (
                <p className="text-sm font-medium text-error" role="alert">{error}</p>
              )}
            </div>

            <DialogFooter className="border-t border-base-300 bg-base-200/45 p-5 sm:justify-between">
              <button
                type="button"
                className="btn btn-ghost btn-sm h-9 min-h-9 rounded-lg px-4"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </button>
              <Button
                type="submit"
                variant="ghost"
                className="btn btn-primary btn-sm h-9 min-h-9 rounded-lg px-4 shadow-sm"
                disabled={isWorking || !adminPassword.trim() || !isPrayerStorageConfigured}
              >
                {isWorking
                  ? <span className="loading loading-spinner loading-sm" />
                  : <LogIn aria-hidden="true" />}
                {isWorking ? "Ingresando…" : "Ingresar"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={saveChanges} className="flex max-h-[90vh] min-h-0 flex-col">
            <DialogHeader className="shrink-0 border-b border-base-300 p-5 pb-4">
              <div className="flex items-start justify-between gap-4 pr-7">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-primary">
                    <BookHeart aria-hidden="true" className="size-5" />
                    <span className="text-xs font-bold uppercase tracking-[0.08em]">
                      Lista de oración
                    </span>
                  </div>
                  <DialogTitle className="text-xl">{title}</DialogTitle>
                  <DialogDescription className="mt-1 text-base-content/60">
                    Agrega, consulta, edita o elimina peticiones y después guarda los cambios.
                  </DialogDescription>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-xs h-8 min-h-8 shrink-0 rounded-lg px-2.5 text-xs"
                  onClick={logout}
                  title="Cerrar sesión administrativa"
                >
                  <LogOut aria-hidden="true" className="size-3.5" />
                  Salir
                </button>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
                <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
                Sesión administrativa activa
              </div>

              {drafts.length > 0 ? (
                <div className="space-y-3">
                  {drafts.map((draft, index) => (
                    <div key={draft.key} className="rounded-xl border border-base-300 bg-base-100 p-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-base-content/55">
                          Oración {index + 1} · {formatDate(draft.createdAt)}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs h-7 min-h-7 rounded-lg px-2 text-error"
                          onClick={() => removeDraft(draft)}
                          aria-label={`Eliminar oración ${index + 1}`}
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                          Eliminar
                        </button>
                      </div>
                      <Textarea
                        value={draft.text}
                        onChange={(event) => updateDraft(draft.key, event.target.value)}
                        placeholder="Escribe la petición de oración…"
                        maxLength={2_000}
                        className="textarea textarea-bordered min-h-24 w-full resize-y rounded-xl bg-base-100 text-sm leading-relaxed focus:border-primary"
                        aria-label={`Texto de la oración ${index + 1}`}
                      />
                      <p className="mt-1 text-right text-[0.7rem] text-base-content/40">
                        {draft.text.length}/2000
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-base-300 bg-base-200/40 px-5 py-8 text-center">
                  <BookHeart aria-hidden="true" className="mx-auto mb-2 size-7 text-base-content/30" />
                  <p className="text-sm font-semibold">Este contacto todavía no tiene oraciones.</p>
                </div>
              )}

              {deletedIds.length > 0 && (
                <p className="rounded-lg bg-error/8 px-3 py-2 text-xs font-semibold text-error">
                  {deletedIds.length === 1
                    ? "Se eliminará 1 oración al guardar."
                    : `Se eliminarán ${deletedIds.length} oraciones al guardar.`}
                </p>
              )}

              <button
                type="button"
                className="btn btn-outline btn-sm h-9 min-h-9 w-full rounded-xl border-dashed"
                onClick={addDraft}
              >
                <ListPlus aria-hidden="true" className="size-4" />
                Agregar otra oración
              </button>

              {error && <p className="text-sm font-medium text-error" role="alert">{error}</p>}
              {success && <p className="text-sm font-semibold text-success" role="status">{success}</p>}
            </div>

            <DialogFooter className="shrink-0 border-t border-base-300 bg-base-200/45 p-5 sm:justify-between">
              <button
                type="button"
                className="btn btn-ghost btn-sm h-9 min-h-9 rounded-lg px-4"
                onClick={() => onOpenChange(false)}
              >
                Cerrar
              </button>
              <Button
                type="submit"
                variant="ghost"
                className="btn btn-primary btn-sm h-9 min-h-9 rounded-lg px-4 shadow-sm"
                disabled={isWorking || !hasChanges || hasEmptySavedPrayer}
              >
                {isWorking
                  ? <span className="loading loading-spinner loading-sm" />
                  : <Save aria-hidden="true" />}
                {isWorking ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
