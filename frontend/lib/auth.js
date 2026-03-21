const API = process.env.NEXT_PUBLIC_API_URL;

// ── Token storage ─────────────────────────────────────────────
export function saveTokens(accessToken, refreshToken, user) {
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!localStorage.getItem("access_token") && !!getUser();
}

export function needsProfile() {
  const user = getUser();
  return user && !user.persona;
}

// ── Token refresh ─────────────────────────────────────────────
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      logout();
      return null;
    }
    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function getAccessToken() {
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiresAt = payload.exp * 1000;
    // Refresh if expiring within 5 minutes
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      return await refreshAccessToken();
    }
    return token;
  } catch {
    return null;
  }
}

// ── Logout ────────────────────────────────────────────────────
export async function logout() {
  const refreshToken = localStorage.getItem("refresh_token");
  if (refreshToken) {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => {});
  }
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  window.location.href = "/auth";
}

// ── Authenticated fetch ───────────────────────────────────────
// Use this everywhere instead of raw fetch()
export async function apiFetch(url, options = {}) {
  const token = await getAccessToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}
