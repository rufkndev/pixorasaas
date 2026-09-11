// Клиент API. Токены живут в httpOnly-куках, JS их не видит — отсюда
// credentials: 'include' везде и полное отсутствие работы с localStorage.

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const parseBody = async (response: Response): Promise<any> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

let refreshInFlight: Promise<boolean> | null = null;

// Все параллельные 401 ждут один промис: refresh-токен ротируется, и второй
// запрос со старым значением провалится, разлогинив пользователя.
const refreshSession = (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
};

// fetch, который сам обновляет просроченный токен.
// Повтор ровно один, иначе при отозванной сессии выйдет бесконечный цикл.
export const apiFetch = async (
  input: string,
  init: RequestInit = {},
  options: { retryOnUnauthorized?: boolean } = {}
): Promise<Response> => {
  const { retryOnUnauthorized = true } = options;

  const request = () =>
    fetch(input, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });

  const response = await request();

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshed = await refreshSession();
    if (refreshed) return request();
  }

  return response;
};

// То же плюс разбор JSON. Бросает ApiError на любой не-2xx.
export const apiJson = async <T = any>(
  input: string,
  init: RequestInit = {}
): Promise<T> => {
  const response = await apiFetch(input, init);
  const body = await parseBody(response);

  if (!response.ok) {
    throw new ApiError(
      body.error || body.message || 'Что-то пошло не так',
      response.status,
      body.code
    );
  }

  return body as T;
};

const post = <T = any>(url: string, payload?: unknown) =>
  apiJson<T>(url, {
    method: 'POST',
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

export const authApi = {
  // null, если сессии нет
  async me(): Promise<AuthUser | null> {
    try {
      const data = await apiJson<{ user: AuthUser }>('/api/auth/me');
      return data.user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },

  register: (payload: {
    email: string;
    password: string;
    fullName?: string;
    consents: { pdn: true; marketing?: boolean };
  }) => post<{ success: true; message: string }>('/api/auth/register', payload),

  login: (payload: { email: string; password: string }) =>
    post<{ success: true; user: AuthUser }>('/api/auth/login', payload),

  logout: () => post<{ success: true }>('/api/auth/logout'),

  verifyEmail: (token: string) =>
    post<{ success: true; user: AuthUser }>('/api/auth/verify-email', { token }),

  resendVerification: (email: string) =>
    post<{ success: true; message: string }>('/api/auth/resend-verification', { email }),

  forgotPassword: (email: string) =>
    post<{ success: true; message: string }>('/api/auth/forgot-password', { email }),

  resetPassword: (payload: { token: string; password: string }) =>
    post<{ success: true; message: string }>('/api/auth/reset-password', payload),

  deleteAccount: (password: string) =>
    apiJson<{ success: true; message: string }>('/api/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
};
