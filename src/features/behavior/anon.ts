// src/features/behavior/anon.ts
export function getAnonymousId() {
  const KEY = "anon_id";
  let id = localStorage.getItem(KEY);

  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    localStorage.setItem(KEY, id);
  }

  return id;
}
