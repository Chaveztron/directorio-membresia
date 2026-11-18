export type GeneralPrayerType = "request" | "church";
export type GeneralPrayerStatus = "fulfilled" | "not_fulfilled";

export type GeneralPrayer = {
  id: string;
  subject: string;
  text: string;
  type: GeneralPrayerType;
  createdAt: string;
  status: GeneralPrayerStatus | null;
  statusChangedAt: string | null;
  hiddenAt: string | null;
};

type FirestoreValue = {
  stringValue?: string;
  timestampValue?: string;
  nullValue?: null;
};

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? "",
};

export const isGeneralPrayerStorageConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

function requireConfiguration() {
  if (!isGeneralPrayerStorageConfigured) {
    throw new Error(
      "El formulario todavía no está conectado a Firebase.",
    );
  }
}

function firestoreBaseUrl() {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/(default)/documents`;
}

async function parseError(response: Response) {
  try {
    const payload = await response.json() as {
      error?: { message?: string } | { message?: string }[];
    };
    const error = Array.isArray(payload.error)
      ? payload.error[0]
      : payload.error;
    return error?.message ?? `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
}

async function firebaseRequest(
  url: string,
  init: RequestInit,
  fallbackMessage: string,
) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const detail = await parseError(response);

    if (response.status === 403) {
      throw new Error(
        "Firebase rechazó la petición. Revisa y publica las reglas de Firestore.",
      );
    }

    if (response.status === 401) {
      throw new Error(
        "Firebase rechazó las credenciales del proyecto. Revisa la configuración.",
      );
    }

    throw new Error(`${fallbackMessage} (${detail})`);
  }

  return response.json();
}

function parseGeneralPrayer(document: FirestoreDocument): GeneralPrayer | null {
  const fields = document.fields;
  const id = document.name.split("/").at(-1);
  const subject = fields?.subject?.stringValue;
  const text = fields?.text?.stringValue;
  const type = fields?.type?.stringValue;
  const createdAt = fields?.createdAt?.timestampValue;
  const statusValue = fields?.status?.stringValue;
  const status = statusValue === "fulfilled" || statusValue === "not_fulfilled"
    ? statusValue
    : null;
  const statusChangedAt = status
    ? (fields?.statusChangedAt?.timestampValue ?? null)
    : null;
  const hiddenAt = fields?.hiddenAt?.timestampValue ?? null;

  if (
    !id
    || !subject
    || text === undefined
    || (type !== "request" && type !== "church")
    || !createdAt
  ) {
    return null;
  }

  return {
    id,
    subject,
    text,
    type,
    createdAt,
    status,
    statusChangedAt,
    hiddenAt,
  };
}

export async function createGeneralPrayer(input: {
  subject: string;
  text: string;
  type: GeneralPrayerType;
}): Promise<GeneralPrayer> {
  requireConfiguration();

  const subject = input.subject.trim();
  const text = input.text.trim();
  if (!subject) {
    throw new Error("Escribe el nombre de la persona o el tema.");
  }

  const documentId = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload = await firebaseRequest(
    `${firestoreBaseUrl()}:commit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [{
          update: {
            name: `projects/${firebaseConfig.projectId}/databases/(default)/documents/generalPrayers/${documentId}`,
            fields: {
              subject: { stringValue: subject },
              text: { stringValue: text },
              type: { stringValue: input.type },
              status: { nullValue: null },
              statusChangedAt: { nullValue: null },
              hiddenAt: { nullValue: null },
            },
          },
          updateTransforms: [{
            fieldPath: "createdAt",
            setToServerValue: "REQUEST_TIME",
          }],
          currentDocument: { exists: false },
        }],
      }),
    },
    "No fue posible guardar la petición.",
  ) as {
    writeResults?: {
      transformResults?: FirestoreValue[];
      updateTime?: string;
    }[];
    commitTime?: string;
  };

  const createdAt = payload.writeResults?.[0]?.transformResults?.[0]?.timestampValue
    ?? payload.writeResults?.[0]?.updateTime
    ?? payload.commitTime
    ?? new Date().toISOString();

  return {
    id: documentId,
    subject,
    text,
    type: input.type,
    createdAt,
    status: null,
    statusChangedAt: null,
    hiddenAt: null,
  };
}

export async function listGeneralPrayers(): Promise<GeneralPrayer[]> {
  requireConfiguration();

  const prayers: GeneralPrayer[] = [];
  let pageToken = "";

  do {
    const parameters = new URLSearchParams({
      pageSize: "500",
      orderBy: "createdAt desc",
    });
    if (pageToken) parameters.set("pageToken", pageToken);

    const payload = await firebaseRequest(
      `${firestoreBaseUrl()}/generalPrayers?${parameters.toString()}`,
      { headers: { "Content-Type": "application/json" } },
      "No fue posible cargar las peticiones generales.",
    ) as {
      documents?: FirestoreDocument[];
      nextPageToken?: string;
    };

    prayers.push(
      ...(payload.documents ?? [])
        .map(parseGeneralPrayer)
        .filter((prayer): prayer is GeneralPrayer => (
          prayer !== null && prayer.hiddenAt === null
        )),
    );
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  return prayers;
}

function documentName(prayerId: string) {
  return `projects/${firebaseConfig.projectId}/databases/(default)/documents/generalPrayers/${prayerId}`;
}

async function commitGeneralPrayerUpdate(
  prayerId: string,
  fields: Record<string, FirestoreValue>,
  updateTransforms: {
    fieldPath: string;
    setToServerValue: "REQUEST_TIME";
  }[],
  fallbackMessage: string,
) {
  requireConfiguration();

  await firebaseRequest(
    `${firestoreBaseUrl()}:commit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [{
          update: {
            name: documentName(prayerId),
            fields,
          },
          updateTransforms,
          currentDocument: { exists: true },
        }],
      }),
    },
    fallbackMessage,
  );
}

function preservedFields(prayer: GeneralPrayer): Record<string, FirestoreValue> {
  return {
    subject: { stringValue: prayer.subject },
    text: { stringValue: prayer.text },
    type: { stringValue: prayer.type },
    createdAt: { timestampValue: prayer.createdAt },
    status: prayer.status
      ? { stringValue: prayer.status }
      : { nullValue: null },
    statusChangedAt: prayer.statusChangedAt
      ? { timestampValue: prayer.statusChangedAt }
      : { nullValue: null },
    hiddenAt: prayer.hiddenAt
      ? { timestampValue: prayer.hiddenAt }
      : { nullValue: null },
  };
}

export async function updateGeneralPrayerStatus(
  prayer: GeneralPrayer,
  status: GeneralPrayerStatus | null,
) {
  const fields = preservedFields(prayer);
  fields.status = status
    ? { stringValue: status }
    : { nullValue: null };

  const updateTransforms = status
    ? [{
        fieldPath: "statusChangedAt",
        setToServerValue: "REQUEST_TIME" as const,
      }]
    : [];

  if (status) {
    delete fields.statusChangedAt;
  } else {
    fields.statusChangedAt = { nullValue: null };
  }

  await commitGeneralPrayerUpdate(
    prayer.id,
    fields,
    updateTransforms,
    "No fue posible actualizar el estado de la petición.",
  );
}

export async function hideGeneralPrayer(
  prayer: GeneralPrayer,
) {
  const fields = preservedFields(prayer);
  delete fields.hiddenAt;

  await commitGeneralPrayerUpdate(
    prayer.id,
    fields,
    [{
      fieldPath: "hiddenAt",
      setToServerValue: "REQUEST_TIME",
    }],
    "No fue posible ocultar la petición.",
  );
}
