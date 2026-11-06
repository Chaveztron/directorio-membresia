export type Suggestion = {
  id: string;
  text: string;
  createdAt: string;
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

export const isSuggestionStorageConfigured = Boolean(
  firebaseConfig.apiKey
    && firebaseConfig.projectId
    && firebaseConfig.adminEmail,
);

function requireConfiguration() {
  if (!isSuggestionStorageConfigured) {
    throw new Error(
      "El buzón de sugerencias todavía no está conectado a Firebase.",
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

    if (response.status === 401) {
      throw new Error("La sesión administrativa venció. Inicia sesión nuevamente.");
    }

    if (response.status === 403) {
      throw new Error(
        "Firebase rechazó la operación. Revisa las reglas de Firestore.",
      );
    }

    throw new Error(`${fallbackMessage} (${detail})`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function parseSuggestion(document: FirestoreDocument): Suggestion | null {
  const fields = document.fields;
  const id = document.name.split("/").at(-1);
  const text = fields?.text?.stringValue;
  const createdAt = fields?.createdAt?.timestampValue;

  if (!id || !text || !createdAt) return null;
  return { id, text, createdAt };
}

export async function createSuggestion(text: string) {
  requireConfiguration();

  await firebaseRequest(
    `${firestoreBaseUrl()}/suggestions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          text: { stringValue: text.trim() },
          createdAt: { timestampValue: new Date().toISOString() },
        },
      }),
    },
    "No fue posible enviar la sugerencia.",
  );
}

export async function listSuggestions(idToken: string): Promise<Suggestion[]> {
  requireConfiguration();

  const suggestions: Suggestion[] = [];
  let pageToken = "";

  do {
    const parameters = new URLSearchParams({
      pageSize: "500",
      orderBy: "createdAt desc",
    });
    if (pageToken) parameters.set("pageToken", pageToken);

    const payload = await firebaseRequest(
      `${firestoreBaseUrl()}/suggestions?${parameters.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      },
      "No fue posible consultar el buzón de sugerencias.",
    ) as {
      documents?: FirestoreDocument[];
      nextPageToken?: string;
    };

    suggestions.push(
      ...(payload.documents ?? [])
        .map(parseSuggestion)
        .filter((suggestion): suggestion is Suggestion => suggestion !== null),
    );
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  return suggestions;
}
