const ACCESS_TOKEN_KEY = 'daymark.accessToken';
const REFRESH_TOKEN_KEY = 'daymark.refreshToken';
let refreshPromise = null;

export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens({ accessToken, refreshToken }) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
}

function notifySessionExpired() {
  window.dispatchEvent(new Event('daymark:session-expired'));
}

function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const payload = await parseResponse(response);
    saveTokens(payload);
    return payload.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function apiFetch(path, options = {}, canRefresh = true) {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${path}`, { ...options, headers });
  if (response.status === 401 && canRefresh && getRefreshToken()) {
    try {
      await refreshAccessToken();
      return apiFetch(path, options, false);
    } catch {
      clearTokens();
      notifySessionExpired();
    }
  }
  return parseResponse(response);
}

export const authApi = {
  async login(email, password) {
    const payload = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveTokens(payload);
    return payload.user;
  },
  async register(email, password) {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  async me() {
    return apiFetch('/auth/me');
  },
  async logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }, false).catch(() => undefined);
    }
    clearTokens();
  },
};

export const taskApi = {
  list({ status, page = 1, perPage = 8 } = {}) {
    const query = new URLSearchParams({ page, per_page: perPage });
    if (status) query.set('status', status);
    return apiFetch(`/tasks?${query.toString()}`);
  },
  create(task) {
    return apiFetch('/tasks', { method: 'POST', body: JSON.stringify(task) });
  },
  update(id, task) {
    return apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) });
  },
  remove(id) {
    return apiFetch(`/tasks/${id}`, { method: 'DELETE' });
  },
};
