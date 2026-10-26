const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function computeDiff(source, target) {
  const resp = await fetch(`${API_BASE_URL}/api/diff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, target }),
  });
  if (!resp.ok) throw new Error("Diff calculation failed");
  return resp.json();
}

export async function runRewrite(payload) {
  const resp = await fetch(`${API_BASE_URL}/api/rewrite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error?.message || "An unexpected error occurred.");
  }
  return data;
}

export async function fetchSynonymsApi(payload) {
  const resp = await fetch(`${API_BASE_URL}/api/synonyms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error?.message || "Could not fetch suggestions.");
  }
  return data;
}