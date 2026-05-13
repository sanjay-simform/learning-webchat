export const AUTH_LOGOUT_EVENT = "webchat:logout";

const DEFAULT_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

export function setAccessToken(token: string): void {
  localStorage.setItem("access_token", token);
}

export function clearAuthSession(): void {
  localStorage.removeItem("access_token");
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
}

export function buildWebSocketUrl(path = "/ws", token?: string | null): string {
  const url = new URL(DEFAULT_API_URL);

  if (url.pathname.endsWith("/api")) {
    url.pathname = url.pathname.slice(0, -4) || "/";
  }

  url.pathname = `${url.pathname.replace(/\/$/, "")}${path}`;
  url.search = "";
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  if (token) {
    url.searchParams.set("token", token);
  }

  return url.toString();
}
