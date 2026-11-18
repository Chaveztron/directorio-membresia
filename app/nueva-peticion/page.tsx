"use client";

import {
  ArrowLeft,
  BookHeart,
  CheckCircle2,
  Church,
  Eraser,
  HeartHandshake,
  Send,
  UserRound,
} from "lucide-react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createGeneralPrayer,
  isGeneralPrayerStorageConfigured,
} from "@/lib/general-prayers";
import type { GeneralPrayerType } from "@/lib/general-prayers";

function formatSubmittedDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function NewPrayerPage() {
  const subjectInput = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState<GeneralPrayerType>("request");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  function clearForm({ focus = false } = {}) {
    setSubject("");
    setText("");
    setType("request");
    setError("");
    setSubmittedAt(null);

    if (focus) {
      window.setTimeout(() => subjectInput.current?.focus(), 0);
    }
  }

  async function submitPrayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subject.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    try {
      const created = await createGeneralPrayer({ subject, text, type });
      setSubmittedAt(created.createdAt);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar la petición.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="directory-page min-h-[100dvh] text-base-content">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-6 sm:py-10">
        <a
          href="../"
          className="mb-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/8"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Volver al directorio
        </a>

        <section className="overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-[0_22px_65px_rgba(23,32,51,0.11)]">
          <div className="h-1.5 bg-gradient-to-r from-primary via-cyan-600 to-sky-300" />

          {submittedAt ? (
            <div className="px-5 py-9 text-center sm:px-8 sm:py-11" aria-live="polite">
              <div className="mx-auto grid size-16 place-items-center rounded-full border border-success/25 bg-success/10 text-success shadow-sm">
                <CheckCircle2 aria-hidden="true" className="size-8" />
              </div>
              <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-success">
                Agregado
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                Petición registrada
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-base-content/60">
                Gracias por compartirla. Fue guardada el {formatSubmittedDate(submittedAt)}.
              </p>

              <div className="my-7 h-px bg-base-300" />

              <h2 className="text-lg font-bold">
                ¿Deseas agregar otra petición?
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="btn btn-primary min-h-12 w-full rounded-xl px-5 text-base shadow-sm"
                  onClick={() => clearForm({ focus: true })}
                >
                  Sí, agregar otra
                </Button>
                <a
                  href="../"
                  className="btn btn-outline min-h-12 w-full rounded-xl px-5 text-base"
                >
                  No, ir al directorio
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={submitPrayer}>
              <header className="border-b border-base-300 bg-gradient-to-br from-primary/8 via-white to-sky-50 px-5 py-6 sm:px-8">
                <div className="flex items-start gap-3.5">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-content shadow-sm">
                    <BookHeart aria-hidden="true" className="size-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                      Formulario público
                    </p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">
                      Oraciones en general
                    </h1>
                    <p className="mt-1 text-sm leading-relaxed text-base-content/60">
                      Comparte una petición para que podamos unirnos en oración.
                    </p>
                  </div>
                </div>
              </header>

              <div className="space-y-6 px-5 py-6 sm:px-8">
                {!isGeneralPrayerStorageConfigured && (
                  <div className="rounded-xl border border-warning/35 bg-warning/10 p-3 text-sm font-medium text-warning-content" role="alert">
                    Firebase aún no está configurado. Completa las variables del proyecto antes de publicar.
                  </div>
                )}

                <div>
                  <label htmlFor="general-prayer-subject" className="flex items-center gap-2 text-sm font-bold">
                    <UserRound aria-hidden="true" className="size-4 text-primary" />
                    Nombre de la persona o tema
                  </label>
                  <Input
                    ref={subjectInput}
                    id="general-prayer-subject"
                    value={subject}
                    onChange={(event) => {
                      setSubject(event.target.value);
                      if (error) setError("");
                    }}
                    maxLength={120}
                    autoComplete="off"
                    required
                    className="input input-bordered mt-2 h-12 w-full rounded-xl bg-base-100 px-4 text-base focus:border-primary"
                    placeholder="Ej. Familia López o salud"
                  />
                  <p className="mt-1.5 text-right text-xs text-base-content/40">
                    {subject.length}/120
                  </p>
                </div>

                <div>
                  <label htmlFor="general-prayer-text" className="flex items-center gap-2 text-sm font-bold">
                    <BookHeart aria-hidden="true" className="size-4 text-primary" />
                    Oración <span className="font-medium text-base-content/45">(opcional)</span>
                  </label>
                  <Textarea
                    id="general-prayer-text"
                    value={text}
                    onChange={(event) => {
                      setText(event.target.value);
                      if (error) setError("");
                    }}
                    maxLength={2000}
                    className="textarea textarea-bordered mt-2 min-h-40 w-full resize-y rounded-xl bg-base-100 px-4 py-3 text-base leading-relaxed focus:border-primary"
                    placeholder="Escribe aquí los detalles de la petición…"
                  />
                  <div className="mt-1.5 flex items-start justify-between gap-3 text-xs text-base-content/40">
                    <p>Evita incluir información confidencial que no sea necesaria.</p>
                    <p className="shrink-0">{text.length}/2000</p>
                  </div>
                </div>

                <fieldset>
                  <legend className="text-sm font-bold">Tipo de oración</legend>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <label className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      type === "request"
                        ? "border-primary bg-primary/8 text-primary"
                        : "border-base-300 bg-base-100 hover:bg-base-200/50"
                    }`}>
                      <input
                        type="radio"
                        name="general-prayer-type"
                        value="request"
                        checked={type === "request"}
                        onChange={() => setType("request")}
                        className="radio radio-primary radio-sm"
                      />
                      <HeartHandshake aria-hidden="true" className="size-5 shrink-0" />
                      <span className="font-bold">Petición</span>
                    </label>
                    <label className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      type === "church"
                        ? "border-primary bg-primary/8 text-primary"
                        : "border-base-300 bg-base-100 hover:bg-base-200/50"
                    }`}>
                      <input
                        type="radio"
                        name="general-prayer-type"
                        value="church"
                        checked={type === "church"}
                        onChange={() => setType("church")}
                        className="radio radio-primary radio-sm"
                      />
                      <Church aria-hidden="true" className="size-5 shrink-0" />
                      <span className="font-bold">Iglesia en general</span>
                    </label>
                  </div>
                </fieldset>

                {error && (
                  <p className="rounded-xl border border-error/25 bg-error/8 px-4 py-3 text-sm font-medium text-error" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <footer className="grid gap-3 border-t border-base-300 bg-base-200/45 px-5 py-5 sm:grid-cols-[1fr_auto] sm:px-8">
                <Button
                  type="submit"
                  variant="ghost"
                  className="btn btn-primary min-h-12 w-full rounded-xl px-5 text-base shadow-sm"
                  disabled={isSubmitting || !subject.trim() || !isGeneralPrayerStorageConfigured}
                >
                  {isSubmitting
                    ? <span className="loading loading-spinner loading-sm" />
                    : <Send aria-hidden="true" className="size-5" />}
                  {isSubmitting ? "Enviando…" : "Enviar petición"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="btn btn-outline min-h-12 w-full rounded-xl px-5 text-base sm:w-auto"
                  onClick={() => clearForm()}
                  disabled={isSubmitting || (!subject && !text && type === "request")}
                >
                  <Eraser aria-hidden="true" className="size-5" />
                  Limpiar formulario
                </Button>
              </footer>
            </form>
          )}
        </section>

        <p className="mt-4 px-3 text-center text-xs leading-relaxed text-base-content/45">
          No necesitas contraseña. La fecha y hora se registran automáticamente al enviar.
        </p>
      </div>
    </main>
  );
}
