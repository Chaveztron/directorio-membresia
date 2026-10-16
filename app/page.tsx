"use client";

import {
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  fechaNacimiento: string;
  direccion: string;
  telefono: string;
  estadoCivil: string;
  fechaIngreso: string;
  ministerios: string[];
  habilidades: string[];
};

type SensitiveDirectory = Record<string, SensitiveInfo>;

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

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
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
    return PUBLIC_CONTACTS.filter((contact) =>
      normalize(contact.nombre).includes(normalizedQuery),
    );
  }, [query]);

  const isUnlocked = sensitiveDirectory !== null;

  useEffect(() => {
    if (!isUnlocked || !isPrayerStorageConfigured) return;

    let cancelled = false;
    setPrayerLoadError("");

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
      setPasswordDialogOpen(false);
    } catch {
      setUnlockError("La contraseña no es correcta. Inténtalo nuevamente.");
    } finally {
      setIsUnlocking(false);
    }
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
                className={`btn btn-sm h-9 min-h-9 rounded-lg px-3.5 text-sm shadow-sm ${
                  isUnlocked ? "btn-outline btn-error" : "btn-primary"
                }`}
              onClick={() =>
                isUnlocked ? lockDirectory() : setPasswordDialogOpen(true)
              }
            >
              {isUnlocked ? (
                <>
                  <EyeOff aria-hidden="true" /> Ocultar información
                </>
              ) : (
                <>
                  <LockKeyhole aria-hidden="true" /> Ver información sensible
                </>
              )}
            </Button>
          </div>
        </header>

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
                className={`directory-status ${
                  isUnlocked
                    ? "directory-status--visible"
                    : "directory-status--locked"
                }`}
              >
                {isUnlocked ? (
                  <Eye aria-hidden="true" />
                ) : (
                  <LockKeyhole aria-hidden="true" />
                )}

                <span>
                  {isUnlocked ? "Datos visibles" : "Datos protegidos"}
                </span>
              </span>
          </div>
          {isUnlocked && prayerLoadError && (
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

              return (
                <article
                  key={contact.id}
                  className="directory-card card overflow-hidden rounded-2xl border border-base-300 bg-base-100"
                >
                  <div className="h-1 bg-gradient-to-r from-primary via-cyan-600 to-sky-300" />

                  <div className="card-body gap-0 p-0">
                    <div className="flex items-center gap-3.5 border-b border-base-300 bg-gradient-to-br from-white to-sky-50/80 px-5 py-4">
                      <ContactAvatar
                        image={contact.imagen}
                        name={contact.nombre}
                      />

                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-bold tracking-tight text-base-content">
                          {contact.nombre}
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
                          onView={() => openPrayerDialog(contact, "view")}
                          onAdd={() => openPrayerDialog(contact, "add")}
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
                            La información está protegida.
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            className="btn btn-outline btn-xs h-8 min-h-8 rounded-lg px-3"
                            onClick={() => setPasswordDialogOpen(true)}
                          >
                            Ver información
                          </Button>
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

      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) {
            setPassword("");
            setUnlockError("");
          }
        }}
      >
        <DialogContent className="rounded-2xl border-base-300 bg-base-100 p-0 shadow-2xl sm:max-w-md">
          <form onSubmit={unlockDirectory}>
            <DialogHeader className="border-b border-base-300 p-5 pb-4">
              <div className="mb-1 grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                <LockKeyhole aria-hidden="true" className="size-5" />
              </div>
              <DialogTitle className="text-xl">Desbloquear información sensible</DialogTitle>
              <DialogDescription className="text-base-content/60">
                Ingresa la contraseña del directorio para ver los datos de los miembros.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 p-5">
              <label htmlFor="directory-password" className="label font-semibold">Contraseña</label>
              <Input
                id="directory-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                aria-invalid={Boolean(unlockError)}
                aria-describedby={unlockError ? "password-error" : undefined}
                className="input input-bordered h-10 w-full rounded-lg bg-base-100 px-3 text-sm focus:border-primary"
                placeholder="Escribe la contraseña"
              />
              {unlockError && (
                <p id="password-error" className="pt-1 text-sm font-medium text-error" role="alert">
                  {unlockError}
                </p>
              )}
            </div>

            <DialogFooter className="border-t border-base-300 bg-base-200/45 p-5 sm:justify-between">
              <button type="button" className="btn btn-ghost btn-sm h-9 min-h-9 rounded-lg px-4" onClick={() => setPasswordDialogOpen(false)}>
                Cancelar
              </button>
              <Button
                type="submit"
                variant="ghost"
                className="btn btn-primary btn-sm h-9 min-h-9 rounded-lg px-4 shadow-sm"
                disabled={isUnlocking || !password.trim()}
              >
                {isUnlocking ? <span className="loading loading-spinner loading-sm" /> : <Eye aria-hidden="true" />}
                {isUnlocking ? "Verificando…" : "Desbloquear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
