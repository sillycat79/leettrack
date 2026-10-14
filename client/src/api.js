async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.join(", ") || "Request failed");
  return data;
}

export const api = {
  list: (filters = {}) => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    return request(`/problems${qs ? "?" + qs : ""}`);
  },
  create: (p) => request("/problems", { method: "POST", body: JSON.stringify(p) }),
  update: (id, p) => request(`/problems/${id}`, { method: "PUT", body: JSON.stringify(p) }),
  remove: (id) => request(`/problems/${id}`, { method: "DELETE" }),
  stats: () => request(`/stats?today=${localDate()}`),
  topics: () => request("/topics"),
};

export function localDate(d = new Date()) {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d - off).toISOString().slice(0, 10);
}
