const API = process.env.NEXT_PUBLIC_API_URL

// Rehydrate the access token from localStorage on page load
let _accessToken = (typeof window !== "undefined")
  ? localStorage.getItem("access_token")
  : null

export function saveTokens(accessToken, user) {
  _accessToken = accessToken
  localStorage.setItem("access_token", accessToken)
  localStorage.setItem("user", JSON.stringify(user))
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null")
  } catch { return null }
}

export function isLoggedIn() {
  return !!getUser() && !!_accessToken
}

export function needsProfile() {
  const user = getUser()
  return user && !user.persona
}

async function refreshAccessToken() {
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
    if (!res.ok) {
      // Don't auto-logout here — the caller or apiFetch will handle 401s
      return null
    }
    const data = await res.json()
    _accessToken = data.access_token
    localStorage.setItem("access_token", data.access_token)
    return _accessToken
  } catch {
    return null
  }
}

export async function getAccessToken() {
  if (_accessToken) {
    try {
      const payload = JSON.parse(atob(_accessToken.split(".")[1]))
      if (payload.exp * 1000 - Date.now() > 5 * 60 * 1000) {
        return _accessToken
      }
    } catch {}
  }
  return await refreshAccessToken()
}

export async function logout() {
  try {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include",
    })
  } catch {}
  _accessToken = null
  localStorage.removeItem("access_token")
  localStorage.removeItem("user")
  window.location.href = "/auth"
}

export async function apiFetch(url, options = {}) {
  const token = await getAccessToken()
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  // If the server says 401, the token is truly invalid — log out
  if (res.status === 401) {
    logout()
    return res
  }

  return res
}
