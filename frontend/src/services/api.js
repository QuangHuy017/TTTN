const baseUrl = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(
  /\/$/,
  "",
);
export async function apiRequest(path, { signal, ...options } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    signal,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || `API error: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}
