"use client";

import {
  BookHeart,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  RotateCcw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  hideGeneralPrayer,
  isGeneralPrayerStorageConfigured,
  listGeneralPrayers,
  updateGeneralPrayerStatus,
} from "@/lib/general-prayers";
import type {
  GeneralPrayer,
  GeneralPrayerStatus,
} from "@/lib/general-prayers";

type GeneralPrayersViewProps = {
  error: string;
  prayers: GeneralPrayer[] | null;
  onPrayersChange: (prayers: GeneralPrayer[] | null) => void;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .trim();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function cardClass(status: GeneralPrayerStatus | null) {
  if (status === "fulfilled") return "border-success/35 bg-success/8";
  if (status === "not_fulfilled") return "border-error/35 bg-error/8";
  return "border-base-300 bg-base-100";
}

export function GeneralPrayersView({
  error,
  prayers,
  onPrayersChange,
}: GeneralPrayersViewProps) {
  const [query, setQuery] = useState("");
  const [workingPrayerId, setWorkingPrayerId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredPrayers = useMemo(() => {
    const cleanQuery = normalize(query);
    if (!prayers || !cleanQuery) return prayers ?? [];

    return prayers.filter((prayer) => {
      const typeLabel = prayer.type === "church"
        ? "Iglesia en general"
        : "Petición";
      const statusLabel = prayer.status === "fulfilled"
        ? "Cumplida"
        : prayer.status === "not_fulfilled"
          ? "No cumplida"
          : "Sin estado";
      const searchableText = [
        prayer.subject,
        prayer.text,
        typeLabel,
        statusLabel,
        formatDateTime(prayer.createdAt),
        prayer.createdAt,
        prayer.statusChangedAt ? formatDateTime(prayer.statusChangedAt) : "",
      ].join(" ");

      return normalize(searchableText).includes(cleanQuery);
    });
  }, [prayers, query]);

  async function refreshPrayers() {
    onPrayersChange(await listGeneralPrayers());
  }

  async function changeStatus(
    prayer: GeneralPrayer,
    status: GeneralPrayerStatus | null,
  ) {
    setWorkingPrayerId(prayer.id);
    setActionError("");
    setSuccess("");
    try {
      await updateGeneralPrayerStatus(prayer, status);
      await refreshPrayers();
      setSuccess(
        status === "fulfilled"
          ? "La petición se marcó como cumplida."
          : status === "not_fulfilled"
            ? "La petición se marcó como no cumplida."
            : "El estado de la petición fue limpiado.",
      );
    } catch (reason) {
      const message = reason instanceof Error
        ? reason.message
        : "No fue posible actualizar la petición.";
      setActionError(message);
    } finally {
      setWorkingPrayerId(null);
    }
  }

  async function hidePrayer(prayer: GeneralPrayer) {
    const confirmed = window.confirm(
      `¿Estás seguro de ocultar la petición “${prayer.subject}”?\n\nNo se borrará de Firebase, pero dejará de aparecer en esta sección.`,
    );
    if (!confirmed) return;

    setWorkingPrayerId(prayer.id);
    setActionError("");
    setSuccess("");
    try {
      await hideGeneralPrayer(prayer);
      await refreshPrayers();
      setSuccess("La petición fue ocultada y se registró la fecha del cambio.");
    } catch (reason) {
      const message = reason instanceof Error
        ? reason.message
        : "No fue posible ocultar la petición.";
      setActionError(message);
    } finally {
      setWorkingPrayerId(null);
    }
  }

  return (
    <section
      id="general-prayers-panel"
      role="tabpanel"
      aria-labelledby="general-prayers-tab"
      aria-live="polite"
    >
      <div className="mb-5 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-base-100 to-sky-50 shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3.5">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-content shadow-sm">
              <HeartHandshake aria-hidden="true" className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Peticiones generales
              </h2>
              <p className="mt-0.5 text-sm text-base-content/60">
                Consulta las peticiones recibidas desde el enlace público.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <a
              href="./nueva-peticion/"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm min-h-10 rounded-xl px-4 shadow-sm"
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              Agregar petición
            </a>
            {prayers !== null && !error && (
              <div className="min-w-20 rounded-xl border border-primary/15 bg-base-100/80 px-3 py-2 text-center shadow-sm">
                <p className="text-xl font-bold text-primary">{prayers.length}</p>
                <p className="text-[0.68rem] font-bold uppercase tracking-wide text-base-content/50">
                  Generales
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <label className="directory-search input input-bordered flex h-11 w-full items-center gap-2.5 rounded-xl bg-base-100 px-3.5 focus-within:border-primary focus-within:outline-none">
          <Search aria-hidden="true" className="size-5 text-base-content/45" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por tema, contenido o fecha…"
            aria-label="Buscar peticiones por tema, contenido o fecha"
            className="h-full border-0 bg-transparent px-0 text-sm shadow-none outline-none focus-visible:border-0 focus-visible:ring-0"
          />
          {query && (
            <button
              type="button"
              className="btn btn-ghost btn-xs h-7 min-h-7 rounded-md px-2 text-xs"
              onClick={() => setQuery("")}
            >
              Limpiar
            </button>
          )}
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-sm text-base-content/60" aria-live="polite">
            {filteredPrayers.length} de {prayers?.length ?? 0} peticiones
          </p>
        </div>

        {actionError && (
          <p className="rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-sm font-medium text-error" role="alert">
            {actionError}
          </p>
        )}
        {success && (
          <p className="rounded-xl border border-success/20 bg-success/5 px-3 py-2 text-sm font-semibold text-success" role="status">
            {success}
          </p>
        )}
      </div>

      {!isGeneralPrayerStorageConfigured ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-6 py-8 text-center">
          <BookHeart aria-hidden="true" className="mx-auto mb-3 size-9 text-warning-content/60" />
          <h3 className="font-bold">Firebase todavía no está configurado</h3>
          <p className="mx-auto mt-1 max-w-lg text-sm text-base-content/60">
            Agrega las variables de Firebase para cargar las peticiones generales.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error/20 bg-error/5 px-6 py-8 text-center text-error" role="alert">
          <BookHeart aria-hidden="true" className="mx-auto mb-3 size-9 opacity-60" />
          <h3 className="font-bold">No fue posible cargar las peticiones generales</h3>
          <p className="mx-auto mt-1 max-w-lg text-sm">{error}</p>
        </div>
      ) : prayers === null ? (
        <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-6 py-9 text-center">
          <span className="loading loading-spinner loading-md text-primary" />
          <p className="mt-3 text-sm font-semibold text-base-content/65">
            Cargando peticiones generales…
          </p>
        </div>
      ) : filteredPrayers.length > 0 ? (
        <div className="grid items-start gap-3 md:grid-cols-2">
          {filteredPrayers.map((prayer) => {
            const isWorking = workingPrayerId === prayer.id;

            return (
              <article
                key={prayer.id}
                className={`relative rounded-2xl border p-4 shadow-sm transition-colors sm:p-5 ${cardClass(prayer.status)}`}
              >
                <button
                  type="button"
                  aria-label={`Ocultar petición: ${prayer.subject}`}
                  title="Ocultar petición"
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-full text-base-content/30 transition-colors hover:bg-error/10 hover:text-error disabled:opacity-30"
                  onClick={() => void hidePrayer(prayer)}
                  disabled={isWorking}
                >
                  <X aria-hidden="true" className="size-4" />
                </button>

                <div className="flex flex-wrap items-start justify-between gap-2 pr-6">
                  <h3 className="min-w-0 flex-1 break-words font-bold text-base-content">
                    {prayer.subject}
                  </h3>
                  <span className="shrink-0 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[0.68rem] font-bold text-primary">
                    {prayer.type === "church" ? "Iglesia en general" : "Petición"}
                  </span>
                </div>

                {prayer.text && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-base-content/75">
                    {prayer.text}
                  </p>
                )}

                <div className="mt-3 border-t border-base-300/70 pt-3">
                  <time
                    dateTime={prayer.createdAt}
                    className="block text-[0.7rem] font-semibold text-base-content/45"
                  >
                    Registrada: {formatDateTime(prayer.createdAt)}
                  </time>

                  {prayer.status && (
                    <span
                      className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-bold ${
                        prayer.status === "fulfilled"
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-error/30 bg-error/10 text-error"
                      }`}
                    >
                      {prayer.status === "fulfilled" ? "✅ Cumplida" : "❌ No cumplida"}
                      {prayer.statusChangedAt
                        ? ` · ${formatDateTime(prayer.statusChangedAt)}`
                        : ""}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-base-300/70 pt-3">
                  <button
                    type="button"
                    className="btn btn-outline btn-xs h-8 min-h-8 rounded-lg border-success/35 px-2.5 text-success hover:bg-success/10"
                    onClick={() => void changeStatus(prayer, "fulfilled")}
                    disabled={isWorking}
                  >
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />
                    Cumplida
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs h-8 min-h-8 rounded-lg border-error/35 px-2.5 text-error hover:bg-error/10"
                    onClick={() => void changeStatus(prayer, "not_fulfilled")}
                    disabled={isWorking}
                  >
                    <XCircle aria-hidden="true" className="size-3.5" />
                    No cumplida
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs h-8 min-h-8 rounded-lg px-2.5 text-base-content/55"
                    onClick={() => void changeStatus(prayer, null)}
                    disabled={isWorking || prayer.status === null}
                  >
                    {isWorking
                      ? <span className="loading loading-spinner loading-xs" />
                      : <RotateCcw aria-hidden="true" className="size-3.5" />}
                    Limpiar estado
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : prayers.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-6 py-10 text-center">
          <Search aria-hidden="true" className="mx-auto mb-3 size-9 text-base-content/25" />
          <h3 className="font-bold">No encontramos coincidencias</h3>
          <p className="mt-1 text-sm text-base-content/60">
            Prueba con otro tema, palabra o fecha.
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm mt-3 h-9 min-h-9 rounded-lg px-4 text-primary"
            onClick={() => setQuery("")}
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-6 py-10 text-center">
          <BookHeart aria-hidden="true" className="mx-auto mb-3 size-9 text-base-content/25" />
          <h3 className="font-bold">Todavía no hay peticiones generales</h3>
          <p className="mt-1 text-sm text-base-content/60">
            Las peticiones enviadas desde el formulario público aparecerán aquí.
          </p>
        </div>
      )}
    </section>
  );
}
