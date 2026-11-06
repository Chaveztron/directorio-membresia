"use client";

import {
  Inbox,
  KeyRound,
  LogIn,
  LogOut,
  MessageSquareText,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
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
import { signInPrayerAdmin } from "@/lib/prayers";
import type { PrayerAdminSession } from "@/lib/prayers";
import {
  createSuggestion,
  isSuggestionStorageConfigured,
  listSuggestions,
} from "@/lib/suggestions";
import type { Suggestion } from "@/lib/suggestions";

type MailboxView = "submit" | "login" | "inbox";

type SuggestionMailboxDialogProps = {
  open: boolean;
  session: PrayerAdminSession | null;
  onOpenChange: (open: boolean) => void;
  onSessionChange: (session: PrayerAdminSession | null) => void;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SuggestionMailboxDialog({
  open,
  session,
  onOpenChange,
  onSessionChange,
}: SuggestionMailboxDialogProps) {
  const [view, setView] = useState<MailboxView>("submit");
  const [text, setText] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function closeDialog() {
    setView("submit");
    setText("");
    setAdminPassword("");
    setSuggestions(null);
    setError("");
    setSuccess("");
    onOpenChange(false);
  }

  async function sendSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;

    setIsWorking(true);
    setError("");
    setSuccess("");
    try {
      await createSuggestion(cleanText);
      setText("");
      setSuccess("Gracias. Tu sugerencia se envió correctamente.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible enviar la sugerencia.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function loadInbox(activeSession: PrayerAdminSession) {
    if (Date.now() >= activeSession.expiresAt - 30_000) {
      onSessionChange(null);
      setView("login");
      setError("La sesión administrativa venció. Inicia sesión nuevamente.");
      return;
    }

    setView("inbox");
    setSuggestions(null);
    setIsWorking(true);
    setError("");
    setSuccess("");
    try {
      setSuggestions(await listSuggestions(activeSession.idToken));
    } catch (reason) {
      const message = reason instanceof Error
        ? reason.message
        : "No fue posible consultar el buzón.";
      setSuggestions([]);
      setError(message);

      if (/sesión administrativa venció/i.test(message)) {
        onSessionChange(null);
        setView("login");
      }
    } finally {
      setIsWorking(false);
    }
  }

  async function openInbox() {
    if (!session) {
      setView("login");
      setError("");
      setSuccess("");
      return;
    }

    await loadInbox(session);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminPassword.trim()) return;

    setIsWorking(true);
    setError("");
    setSuccess("");
    try {
      const nextSession = await signInPrayerAdmin(adminPassword);
      const nextSuggestions = await listSuggestions(nextSession.idToken);
      onSessionChange(nextSession);
      setSuggestions(nextSuggestions);
      setAdminPassword("");
      setView("inbox");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible iniciar la sesión administrativa.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  function logout() {
    onSessionChange(null);
    setSuggestions(null);
    setView("submit");
    setError("");
    setSuccess("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeDialog();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-hidden rounded-2xl border-base-300 bg-base-100 p-0 shadow-2xl sm:max-w-2xl">
        {view === "submit" ? (
          <form onSubmit={sendSuggestion}>
            <DialogHeader className="border-b border-base-300 p-5 pb-4">
              <div className="mb-1 grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquareText aria-hidden="true" className="size-5" />
              </div>
              <DialogTitle className="text-xl">
                ¿En qué podemos mejorar?
              </DialogTitle>
              <DialogDescription className="text-base-content/60">
                Queremos escuchar tu opinión. Comparte una sugerencia para ayudarnos a mejorar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 p-5">
              {!isSuggestionStorageConfigured && (
                <div className="rounded-xl border border-warning/35 bg-warning/10 p-3 text-sm text-warning-content" role="alert">
                  Firebase aún no está configurado. Agrega las tres variables indicadas en <code>.env.example</code>.
                </div>
              )}

              <label htmlFor="suggestion-text" className="label font-semibold">
                Tu sugerencia
              </label>
              <Textarea
                id="suggestion-text"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  if (error) setError("");
                  if (success) setSuccess("");
                }}
                maxLength={2000}
                className="textarea textarea-bordered min-h-36 w-full resize-y rounded-xl bg-base-100 text-sm leading-relaxed focus:border-primary"
                placeholder="Escribe aquí tu sugerencia…"
                aria-invalid={Boolean(error)}
              />
              <p className="text-right text-[0.7rem] text-base-content/40">
                {text.length}/2000
              </p>

              {error && <p className="text-sm font-medium text-error" role="alert">{error}</p>}
              {success && <p className="text-sm font-semibold text-success" role="status">{success}</p>}
            </div>

            <div className="flex flex-col gap-2 border-t border-base-300 bg-base-200/45 p-5 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="btn btn-outline btn-sm h-9 min-h-9 rounded-lg px-4"
                onClick={() => void openInbox()}
                disabled={!isSuggestionStorageConfigured || isWorking}
              >
                <KeyRound aria-hidden="true" />
                Consultar buzón
              </Button>

              <div className="flex gap-2 sm:justify-end">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm h-9 min-h-9 flex-1 rounded-lg px-4 sm:flex-none"
                  onClick={closeDialog}
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  variant="ghost"
                  className="btn btn-primary btn-sm h-9 min-h-9 flex-1 rounded-lg px-4 shadow-sm sm:flex-none"
                  disabled={isWorking || !text.trim() || !isSuggestionStorageConfigured}
                >
                  {isWorking
                    ? <span className="loading loading-spinner loading-sm" />
                    : <Send aria-hidden="true" />}
                  {isWorking ? "Enviando…" : "Enviar sugerencia"}
                </Button>
              </div>
            </div>
          </form>
        ) : view === "login" ? (
          <form onSubmit={login}>
            <DialogHeader className="border-b border-base-300 p-5 pb-4">
              <div className="mb-1 grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound aria-hidden="true" className="size-5" />
              </div>
              <DialogTitle className="text-xl">Acceso al buzón</DialogTitle>
              <DialogDescription className="text-base-content/60">
                Ingresa la contraseña de la cuenta administrativa de Firebase para consultar las sugerencias.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 p-5">
              <label htmlFor="suggestion-admin-password" className="label font-semibold">
                Contraseña del administrador
              </label>
              <Input
                id="suggestion-admin-password"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                className="input input-bordered h-10 w-full rounded-lg bg-base-100 px-3 text-sm focus:border-primary"
                placeholder="Escribe la contraseña administrativa"
                aria-invalid={Boolean(error)}
              />
              {error && <p className="text-sm font-medium text-error" role="alert">{error}</p>}
            </div>

            <DialogFooter className="border-t border-base-300 bg-base-200/45 p-5 sm:justify-between">
              <button
                type="button"
                className="btn btn-ghost btn-sm h-9 min-h-9 rounded-lg px-4"
                onClick={() => {
                  setView("submit");
                  setError("");
                  setAdminPassword("");
                }}
              >
                Regresar
              </button>
              <Button
                type="submit"
                variant="ghost"
                className="btn btn-primary btn-sm h-9 min-h-9 rounded-lg px-4 shadow-sm"
                disabled={isWorking || !adminPassword.trim() || !isSuggestionStorageConfigured}
              >
                {isWorking
                  ? <span className="loading loading-spinner loading-sm" />
                  : <LogIn aria-hidden="true" />}
                {isWorking ? "Ingresando…" : "Ingresar"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex max-h-[90vh] min-h-0 flex-col">
            <DialogHeader className="shrink-0 border-b border-base-300 p-5 pb-4">
              <div className="flex items-start justify-between gap-4 pr-7">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-primary">
                    <Inbox aria-hidden="true" className="size-5" />
                    <span className="text-xs font-bold uppercase tracking-[0.08em]">
                      Bandeja administrativa
                    </span>
                  </div>
                  <DialogTitle className="text-xl">Buzón de sugerencias</DialogTitle>
                  <DialogDescription className="mt-1 text-base-content/60">
                    Solo la cuenta administrativa puede consultar estos mensajes.
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

              {isWorking || suggestions === null ? (
                <div className="rounded-xl border border-dashed border-base-300 bg-base-200/40 px-5 py-8 text-center">
                  <span className="loading loading-spinner loading-md text-primary" />
                  <p className="mt-3 text-sm font-semibold">Cargando sugerencias…</p>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <article
                      key={suggestion.id}
                      className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-base-content/50">
                        <span>Sugerencia {index + 1}</span>
                        <time dateTime={suggestion.createdAt}>
                          {formatDate(suggestion.createdAt)}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-base-content/85">
                        {suggestion.text}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-base-300 bg-base-200/40 px-5 py-8 text-center">
                  <Inbox aria-hidden="true" className="mx-auto mb-2 size-7 text-base-content/30" />
                  <p className="text-sm font-semibold">El buzón todavía está vacío.</p>
                </div>
              )}

              {error && <p className="text-sm font-medium text-error" role="alert">{error}</p>}
            </div>

            <DialogFooter className="shrink-0 border-t border-base-300 bg-base-200/45 p-5 sm:justify-between">
              <button
                type="button"
                className="btn btn-ghost btn-sm h-9 min-h-9 rounded-lg px-4"
                onClick={closeDialog}
              >
                Cerrar
              </button>
              <Button
                type="button"
                variant="ghost"
                className="btn btn-outline btn-sm h-9 min-h-9 rounded-lg px-4"
                onClick={() => {
                  setView("submit");
                  setError("");
                }}
              >
                <MessageSquareText aria-hidden="true" />
                Nueva sugerencia
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
