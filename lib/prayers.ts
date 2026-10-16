export type PrayerAdminSession = {
  idToken: string;
  uid: string;
  email: string;
  expiresAt: number;
};

export type Prayer = {
  id: string;
  contactId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

type FirestoreValue = {
  stringValue?: string;
  timestampValue?: string;
};

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? "",
  adminEmail: import.meta.env.VITE_FIREBASE_ADMIN_EMAIL?.trim() ?? "",
};

export const isPrayerStorageConfigured = Boolean(
  firebaseConfig.apiKey
    && firebaseConfig.projectId
    && firebaseConfig.adminEmail,
);

function requireConfiguration() {
  if (!isPrayerStorageConfigured) {
    throw new Error(
      "El almacenamiento de oraciones todavía no está conectado a Firebase.",
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

    if (
      response.status === 400
      && /INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(detail)
    ) {
      throw new Error("La contraseña administrativa no es correcta.");
    }

    if (response.status === 401) {
      throw new Error("La sesión administrativa venció. Inicia sesión nuevamente.");
    }

    if (response.status === 403) {
      throw new Error(
        "Firebase rechazó la operación. Revisa el UID y las reglas de Firestore.",
      );
    }

    throw new Error(`${fallbackMessage} (${detail})`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function signInPrayerAdmin(
  password: string,
): Promise<PrayerAdminSession> {
  requireConfiguration();

  const payload = await firebaseRequest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: firebaseConfig.adminEmail,
        password,
        returnSecureToken: true,
      }),
    },
    "No fue posible iniciar la sesión administrativa.",
  ) as {
    idToken: string;
    localId: string;
    email: string;
    expiresIn: string;
  };

  return {
    idToken: payload.idToken,
    uid: payload.localId,
    email: payload.email,
    expiresAt: Date.now() + Number(payload.expiresIn) * 1_000,
  };
}

function parsePrayer(document: FirestoreDocument): Prayer | null {
  const fields = document.fields;
  const id = document.name.split("/").at(-1);
  const contactId = fields?.contactId?.stringValue;
  const text = fields?.text?.stringValue;
  const createdAt = fields?.createdAt?.timestampValue;
  const updatedAt = fields?.updatedAt?.timestampValue;

  if (!id || !contactId || !text || !createdAt || !updatedAt) return null;

  return { id, contactId, text, createdAt, updatedAt };
}

function serializePrayer(prayer: Omit<Prayer, "id">) {
  return {
    fields: {
      contactId: { stringValue: prayer.contactId },
      text: { stringValue: prayer.text },
      createdAt: { timestampValue: prayer.createdAt },
      updatedAt: { timestampValue: prayer.updatedAt },
    },
  };
}

function authHeaders(idToken: string) {
  return {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  };
}

export async function listPrayers(idToken: string): Promise<Prayer[]> {
  requireConfiguration();

  const prayers: Prayer[] = [];
  let pageToken = "";

  do {
    const parameters = new URLSearchParams({
      pageSize: "500",
      orderBy: "createdAt desc",
    });
    if (pageToken) parameters.set("pageToken", pageToken);

    const payload = await firebaseRequest(
      `${firestoreBaseUrl()}/prayers?${parameters.toString()}`,
      { headers: authHeaders(idToken) },
      "No fue posible cargar las oraciones.",
    ) as {
      documents?: FirestoreDocument[];
      nextPageToken?: string;
    };

    prayers.push(
      ...(payload.documents ?? [])
        .map(parsePrayer)
        .filter((prayer): prayer is Prayer => prayer !== null),
    );
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  return prayers;
}

export async function createPrayer(
  idToken: string,
  contactId: string,
  text: string,
) {
  const now = new Date().toISOString();
  await firebaseRequest(
    `${firestoreBaseUrl()}/prayers`,
    {
      method: "POST",
      headers: authHeaders(idToken),
      body: JSON.stringify(serializePrayer({
        contactId,
        text: text.trim(),
        createdAt: now,
        updatedAt: now,
      })),
    },
    "No fue posible guardar la oración.",
  );
}

export async function updatePrayer(
  idToken: string,
  prayer: Prayer,
  text: string,
) {
  await firebaseRequest(
    `${firestoreBaseUrl()}/prayers/${encodeURIComponent(prayer.id)}`,
    {
      method: "PATCH",
      headers: authHeaders(idToken),
      body: JSON.stringify(serializePrayer({
        contactId: prayer.contactId,
        text: text.trim(),
        createdAt: prayer.createdAt,
        updatedAt: new Date().toISOString(),
      })),
    },
    "No fue posible actualizar la oración.",
  );
}

export async function deletePrayer(idToken: string, prayerId: string) {
  await firebaseRequest(
    `${firestoreBaseUrl()}/prayers/${encodeURIComponent(prayerId)}`,
    {
      method: "DELETE",
      headers: authHeaders(idToken),
    },
    "No fue posible eliminar la oración.",
  );
}
