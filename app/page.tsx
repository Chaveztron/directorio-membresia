"use client";

import {
  ArrowRight,
  BookHeart,
  BriefcaseBusiness,
  CalendarDays,
  Church,
  Eye,
  EyeOff,
  HeartHandshake,
  LockKeyhole,
  ListPlus,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { PrayerManagerDialog } from "@/components/prayer-manager-dialog";
import { Input } from "@/components/ui/input";
import {
  ENCRYPTED_DIRECTORY,
  PUBLIC_CONTACTS,
} from "@/app/directory-data";
import {
  isPrayerStorageConfigured,
  listPrayers,
} from "@/lib/prayers";
import type { Prayer, PrayerAdminSession } from "@/lib/prayers";

type SensitiveInfo = {
  nombreCompleto?: string;
  fechaNacimiento: string;
  direccion: string;
  telefono: string;
  estadoCivil: string;
  fechaIngreso: string;
  ministerios: string[];
  habilidades: string[];
};

type SensitiveDirectory = Record<string, SensitiveInfo>;

type DirectoryView = "directory" | "prayers";

type PrayerDialogState = {
  contact: {
    id: string;
    nombre: string;
  };
  mode: "view" | "add";
};

function fromBase64(value: string) {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function decryptDirectory(password: string): Promise<SensitiveDirectory> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(ENCRYPTED_DIRECTORY.salt),
      iterations: ENCRYPTED_DIRECTORY.iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ENCRYPTED_DIRECTORY.iv) },
    key,
    fromBase64(ENCRYPTED_DIRECTORY.ciphertext),
  );

  return JSON.parse(new TextDecoder().decode(plaintext)) as SensitiveDirectory;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .trim();
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name.trim();
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function Home() {
  const [activeView, setActiveView] = useState<DirectoryView>("directory");
  const [query, setQuery] = useState("");
  const [password, setPassword] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [sensitiveDirectory, setSensitiveDirectory] =
    useState<SensitiveDirectory | null>(null);
  const [prayerSession, setPrayerSession] =
    useState<PrayerAdminSession | null>(null);
  const [prayers, setPrayers] = useState<Prayer[] | null>(null);
  const [prayerLoadError, setPrayerLoadError] = useState("");
  const [prayerDialog, setPrayerDialog] =
    useState<PrayerDialogState | null>(null);

  const filteredContacts = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return PUBLIC_CONTACTS;
    return PUBLIC_CONTACTS.filter((contact) => {
      const fullName = sensitiveDirectory?.[contact.id]?.nombreCompleto;
      const searchableName = sensitiveDirectory
        ? (fullName ?? contact.nombre)
        : firstName(contact.nombre);

      return normalize(searchableName).includes(normalizedQuery);
    });
  }, [query, sensitiveDirectory]);

  const isUnlocked = sensitiveDirectory !== null;

  useEffect(() => {
    if (!isUnlocked || !isPrayerStorageConfigured) return;

    let cancelled = false;

    void listPrayers()
      .then((nextPrayers) => {
        if (!cancelled) setPrayers(nextPrayers);
      })
      .catch((reason) => {
        if (cancelled) return;
        setPrayers([]);
        setPrayerLoadError(
          reason instanceof Error
            ? reason.message
            : "No fue posible cargar las oraciones.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isUnlocked]);

  const prayerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const prayer of prayers ?? []) {
      counts[prayer.contactId] = (counts[prayer.contactId] ?? 0) + 1;
    }
    return counts;
  }, [prayers]);

  function lockDirectory() {
    setSensitiveDirectory(null);
    setActiveView("directory");
    setQuery("");
    setPrayerSession(null);
    setPrayers(null);
    setPrayerLoadError("");
    setPrayerDialog(null);
    setPassword("");
    setUnlockError("");
  }

  function openPrayerDialog(
    contact: { id: string; nombre: string },
    mode: "view" | "add",
  ) {
    setPrayerDialog({ contact, mode });
  }

  async function unlockDirectory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password.trim()) return;

    setIsUnlocking(true);
    setUnlockError("");
    try {
      const decrypted = await decryptDirectory(password);
      setSensitiveDirectory(decrypted);
      setPassword("");
    } catch {
      setUnlockError("La contraseña no es correcta. Inténtalo nuevamente.");
    } finally {
      setIsUnlocking(false);
    }
  }

  if (!isUnlocked) {
    return (
      <main className="directory-page min-h-screen text-base-content">
        <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-12">
          <section
            aria-labelledby="locked-directory-title"
            className="w-full max-w-md rounded-3xl border border-base-300 bg-base-100/90 px-6 py-10 text-center shadow-[0_24px_70px_rgba(23,32,51,0.12)] backdrop-blur sm:px-10 sm:py-12"
          >
            <div className="mx-auto grid size-16 place-items-center rounded-full border border-primary/20 bg-primary/8 text-primary shadow-sm">
              <LockKeyhole aria-hidden="true" className="size-7" />
            </div>

            <h1
              id="locked-directory-title"
              className="mt-5 text-xl font-bold tracking-tight"
            >
              Directorio protegido
            </h1>
            <p className="mt-1 text-3xl font-bold text-primary">
              {`${PUBLIC_CONTACTS.length} miembros`}
            </p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-base-content/55">
              Ingresa la contraseña para consultar el directorio completo.
            </p>

            <form className="mt-7" onSubmit={unlockDirectory}>
              <label className="sr-only" htmlFor="directory-password">
                Contraseña
              </label>
              <div className="flex h-12 items-center overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <Input
                  id="directory-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (unlockError) setUnlockError("");
                  }}
                  autoComplete="current-password"
                  autoFocus
                  aria-invalid={Boolean(unlockError)}
                  aria-describedby={unlockError ? "password-error" : undefined}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-sm shadow-none outline-none focus-visible:border-0 focus-visible:ring-0"
                  placeholder="Contraseña"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  aria-label="Desbloquear directorio"
                  className="btn btn-ghost h-full min-h-0 rounded-none border-l border-base-300 px-4 text-primary hover:bg-primary/8"
                  disabled={isUnlocking || !password.trim()}
                >
                  {isUnlocking ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <ArrowRight aria-hidden="true" className="size-5" />
                  )}
                </Button>
              </div>

              {unlockError && (
                <p
                  id="password-error"
                  className="mt-3 text-sm font-medium text-error"
                  role="alert"
                >
                  {unlockError}
                </p>
              )}
            </form>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="directory-page min-h-screen text-base-content">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="directory-header mb-4 overflow-hidden rounded-2xl border border-base-300 bg-base-100">
          <div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-content shadow-sm sm:size-14">
                <UsersRound aria-hidden="true" className="size-7" />
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <ShieldCheck aria-hidden="true" className="size-4" />
                  Información personal protegida
                </p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Directorio de miembros
                </h1>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="btn btn-outline btn-error btn-sm h-9 min-h-9 rounded-lg px-3.5 text-sm shadow-sm"
              onClick={lockDirectory}
            >
              <EyeOff aria-hidden="true" /> Ocultar información
            </Button>
          </div>
        </header>

        <nav
          aria-label="Secciones del directorio"
          className="mb-5 flex w-full gap-1 rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-sm sm:w-fit"
          role="tablist"
        >
          <button
            type="button"
            id="directory-tab"
            role="tab"
            aria-selected={activeView === "directory"}
            aria-controls="directory-panel"
            className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors sm:flex-none ${
              activeView === "directory"
                ? "bg-primary text-primary-content shadow-sm"
                : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
            }`}
            onClick={() => setActiveView("directory")}
          >
            <UsersRound aria-hidden="true" className="size-4" />
            Directorio
          </button>
          <button
            type="button"
            id="prayers-tab"
            role="tab"
            aria-selected={activeView === "prayers"}
            aria-controls="prayers-panel"
            className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors sm:flex-none ${
              activeView === "prayers"
                ? "bg-primary text-primary-content shadow-sm"
                : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
            }`}
            onClick={() => setActiveView("prayers")}
          >
            <BookHeart aria-hidden="true" className="size-4" />
            Todas las oraciones
            {prayers !== null && prayers.length > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-[0.68rem] leading-none ${
                  activeView === "prayers"
                    ? "bg-white/20 text-white"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {prayers.length}
              </span>
            )}
          </button>
        </nav>

        {activeView === "directory" ? (
          <div
            id="directory-panel"
            role="tabpanel"
            aria-labelledby="directory-tab"
          >
            <section aria-label="Búsqueda de contactos" className="mb-5">
              <label className="directory-search input input-bordered flex h-11 w-full items-center gap-2.5 rounded-xl bg-base-100 px-3.5 focus-within:border-primary focus-within:outline-none">
                <Search aria-hidden="true" className="size-5 text-base-content/45" />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nombre…"
                  aria-label="Buscar contacto por nombre"
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
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-base-content/65">
                <p aria-live="polite">
                  {filteredContacts.length} de {PUBLIC_CONTACTS.length} contactos
                </p>
                <span
                  role="status"
                  aria-live="polite"
                  className="directory-status directory-status--visible"
                >
                  <Eye aria-hidden="true" />
                  <span>Datos visibles</span>
                </span>
              </div>
              {prayerLoadError && (
                <p
                  className="mt-2 rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-sm font-medium text-error"
                  role="alert"
                >
                  {prayerLoadError}
                </p>
              )}
            </section>

            {filteredContacts.length > 0 ? (
              <section
                aria-label="Lista de contactos"
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              >
                {filteredContacts.map((contact) => {
                  const details = sensitiveDirectory?.[contact.id];
                  const displayName = details?.nombreCompleto
                    ?? (details ? contact.nombre : firstName(contact.nombre));

                  return (
                    <article
                      key={contact.id}
                      className="directory-card card overflow-hidden rounded-2xl border border-base-300 bg-base-100"
                    >
                      <div className="h-1 bg-gradient-to-r from-primary via-cyan-600 to-sky-300" />

                      <div className="card-body gap-0 p-0">
                        <div className="flex items-center gap-3.5 border-b border-base-300 bg-gradient-to-br from-white to-sky-50/80 px-5 py-4">
                          <ContactAvatar
                            image={details ? contact.imagen : null}
                            name={displayName}
                          />

                          <div className="min-w-0 flex-1">
                            <h2 className="truncate text-lg font-bold tracking-tight text-base-content">
                              {displayName}
                            </h2>
                            <p className="mt-0.5 text-xs font-medium text-base-content/50">
                              Miembro del directorio
                            </p>
                          </div>
                        </div>

                        {details ? (
                          <div className="px-5 pb-5 pt-4">
                            <div className="space-y-1">
                              <CompactRow
                                icon={CalendarDays}
                                value={details.fechaNacimiento}
                              />
                              <CompactRow
                                icon={MapPin}
                                value={details.direccion}
                              />
                              <CompactRow
                                icon={Phone}
                                value={details.telefono}
                                href={`tel:${details.telefono.replace(/[^+\d]/g, "")}`}
                              />
                              <CompactRow
                                icon={HeartHandshake}
                                value={details.estadoCivil}
                              />
                            </div>

                            <PrayerActions
                              count={prayerCounts[contact.id] ?? 0}
                              countsLoaded={prayers !== null}
                              onView={() => openPrayerDialog({
                                id: contact.id,
                                nombre: displayName,
                              }, "view")}
                              onAdd={() => openPrayerDialog({
                                id: contact.id,
                                nombre: displayName,
                              }, "add")}
                            />

                            <div className="my-4 h-px bg-base-300" />

                            <div className="space-y-4">
                              <LabeledRow
                                icon={Church}
                                label="Ingreso a la membresía"
                                value={details.fechaIngreso}
                              />
                              <TagList
                                icon={UsersRound}
                                label="Ministerios en los que sirve"
                                values={details.ministerios}
                              />
                              <TagList
                                icon={BriefcaseBusiness}
                                label="Conocimientos, habilidades u oficio"
                                values={details.habilidades}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="px-5 pb-5 pt-4">
                            <div className="rounded-xl border border-dashed border-base-300 bg-base-200/55 px-4 py-4 text-center">
                              <LockKeyhole
                                aria-hidden="true"
                                className="mx-auto mb-2 size-5 text-base-content/35"
                              />
                              <p className="mb-3 text-sm text-base-content/60">
                                La información de este contacto no está disponible.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>
            ) : (
              <section className="rounded-box border border-dashed border-base-300 bg-base-100 px-6 py-14 text-center">
                <UserRound aria-hidden="true" className="mx-auto mb-3 size-10 text-base-content/30" />
                <h2 className="text-lg font-bold">No encontramos ese contacto</h2>
                <p className="mt-1 text-base-content/60">
                  Revisa el nombre o intenta con menos palabras.
                </p>
              </section>
            )}
          </div>
        ) : (
          <AllPrayersView
            directory={sensitiveDirectory}
            error={prayerLoadError}
            prayers={prayers}
          />
        )}
      </div>

      <PrayerManagerDialog
        key={`${prayerDialog?.contact.id ?? "closed"}-${prayerDialog?.mode ?? "add"}-${prayerSession?.uid ?? "guest"}`}
        open={prayerDialog !== null}
        mode={prayerDialog?.mode ?? "add"}
        contact={prayerDialog?.contact ?? null}
        session={prayerSession}
        prayers={prayers}
        onOpenChange={(open) => {
          if (!open) setPrayerDialog(null);
        }}
        onSessionChange={setPrayerSession}
        onPrayersChange={setPrayers}
      />
    </main>
  );
}

function formatPrayerDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function AllPrayersView({ directory, error, prayers }: {
  directory: SensitiveDirectory;
  error: string;
  prayers: Prayer[] | null;
}) {
  const groups = useMemo(() => {
    if (!prayers) return [];

    return PUBLIC_CONTACTS.flatMap((contact) => {
      const contactPrayers = prayers
        .filter((prayer) => prayer.contactId === contact.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      if (contactPrayers.length === 0) return [];

      return [{
        id: contact.id,
        name: directory[contact.id]?.nombreCompleto ?? contact.nombre,
        prayers: contactPrayers,
      }];
    }).sort((left, right) => left.name.localeCompare(right.name, "es-MX"));
  }, [directory, prayers]);

  return (
    <section
      id="prayers-panel"
      role="tabpanel"
      aria-labelledby="prayers-tab"
      aria-live="polite"
    >
      <div className="mb-5 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-base-100 to-sky-50 shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3.5">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-content shadow-sm">
              <BookHeart aria-hidden="true" className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Todas las oraciones
              </h2>
              <p className="mt-0.5 text-sm text-base-content/60">
                Consulta las peticiones agrupadas por miembro.
              </p>
            </div>
          </div>

          {prayers !== null && !error && (
            <div className="flex gap-2 text-center">
              <div className="min-w-20 rounded-xl border border-primary/15 bg-base-100/80 px-3 py-2 shadow-sm">
                <p className="text-xl font-bold text-primary">{prayers.length}</p>
                <p className="text-[0.68rem] font-bold uppercase tracking-wide text-base-content/50">
                  Oraciones
                </p>
              </div>
              <div className="min-w-20 rounded-xl border border-primary/15 bg-base-100/80 px-3 py-2 shadow-sm">
                <p className="text-xl font-bold text-primary">{groups.length}</p>
                <p className="text-[0.68rem] font-bold uppercase tracking-wide text-base-content/50">
                  Miembros
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isPrayerStorageConfigured ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-6 py-10 text-center">
          <BookHeart aria-hidden="true" className="mx-auto mb-3 size-9 text-warning-content/60" />
          <h3 className="font-bold">Firebase todavía no está configurado</h3>
          <p className="mx-auto mt-1 max-w-lg text-sm text-base-content/60">
            Agrega las variables de Firebase para cargar la lista de oraciones.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error/20 bg-error/5 px-6 py-10 text-center text-error" role="alert">
          <BookHeart aria-hidden="true" className="mx-auto mb-3 size-9 opacity-60" />
          <h3 className="font-bold">No fue posible cargar las oraciones</h3>
          <p className="mx-auto mt-1 max-w-lg text-sm">{error}</p>
        </div>
      ) : prayers === null ? (
        <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-6 py-14 text-center">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="mt-3 text-sm font-semibold text-base-content/65">
            Cargando todas las oraciones…
          </p>
        </div>
      ) : groups.length > 0 ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <article
              key={group.id}
              className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm"
            >
              <header className="flex items-center gap-3 border-b border-base-300 bg-gradient-to-r from-primary/8 to-sky-50 px-5 py-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-content shadow-sm">
                  {initials(group.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold text-base-content">
                    {group.name}
                  </h3>
                  <p className="mt-0.5 text-xs font-semibold text-base-content/50">
                    {group.prayers.length === 1
                      ? "1 oración"
                      : `${group.prayers.length} oraciones`}
                  </p>
                </div>
              </header>

              <ol className="space-y-3 p-4 sm:p-5">
                {group.prayers.map((prayer, index) => (
                  <li
                    key={prayer.id}
                    className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-xl border border-base-300 bg-base-200/30 p-3.5"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-base-content/85">
                        {prayer.text}
                      </p>
                      <time
                        dateTime={prayer.createdAt}
                        className="mt-2 block text-[0.7rem] font-semibold text-base-content/45"
                      >
                        {formatPrayerDate(prayer.createdAt)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-6 py-14 text-center">
          <BookHeart aria-hidden="true" className="mx-auto mb-3 size-10 text-base-content/25" />
          <h3 className="text-lg font-bold">Todavía no hay oraciones</h3>
          <p className="mt-1 text-sm text-base-content/60">
            Cuando se agregue la primera petición aparecerá en esta sección.
          </p>
        </div>
      )}
    </section>
  );
}

function PrayerActions({
  count,
  countsLoaded,
  onView,
  onAdd,
}: {
  count: number;
  countsLoaded: boolean;
  onView: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-base-300/70 pt-3">
      {countsLoaded && count > 0 && (
        <Button
          type="button"
          variant="ghost"
          className="btn btn-outline btn-sm h-9 min-h-9 flex-1 rounded-xl border-primary/25 px-3 text-primary"
          onClick={onView}
        >
          <BookHeart aria-hidden="true" className="size-4" />
          Ver oraciones ({count})
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        className="btn btn-primary btn-sm h-9 min-h-9 flex-1 rounded-xl px-3 shadow-sm"
        onClick={onAdd}
      >
        <ListPlus aria-hidden="true" className="size-4" />
        Agregar oración
      </Button>
    </div>
  );
}

function ContactAvatar({ name, image }: {
  name: string;
  image: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(image) && !imageFailed;

  return (
    <div className="avatar placeholder shrink-0">
      <div className="contact-card__avatar grid size-16 place-items-center overflow-hidden rounded-2xl border border-primary/15 bg-primary text-primary-content">
        {showImage ? (
          <img
            src={image ?? undefined}
            alt={`Fotografía de ${name}`}
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="text-base font-bold">
            {initials(name)}
          </span>
        )}
      </div>
    </div>
  );
}

function CompactRow({ icon: Icon, value, href }: {
  icon: typeof CalendarDays;
  value: string;
  href?: string;
}) {
  return (
    <div className="grid min-h-10 grid-cols-[2rem_minmax(0,1fr)] items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors hover:bg-primary/5">
      <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-4" />
      </span>

      {href ? (
        <a
          className="min-w-0 truncate text-sm font-semibold text-primary hover:underline"
          href={href}
        >
          {value}
        </a>
      ) : (
        <p className="min-w-0 text-sm font-medium leading-relaxed text-base-content/80">
          {value}
        </p>
      )}
    </div>
  );
}

function LabeledRow({ icon: Icon, label, value }: {
  icon: typeof Church;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase leading-tight tracking-[0.055em] text-base-content/50">
        <Icon aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-base-content">
        {value}
      </p>
    </div>
  );
}

function TagList({ icon: Icon, label, values }: {
  icon: typeof UsersRound;
  label: string;
  values: string[];
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase leading-tight tracking-[0.055em] text-base-content/50">
        <Icon aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
        <span>{label}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex min-h-7 items-center rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-xs font-semibold leading-none text-primary"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
