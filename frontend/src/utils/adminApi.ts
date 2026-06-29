export async function adminFetch(path: string, token: string | null, options: RequestInit = {}) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const url = `${API_URL}/api/admin${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.message || errorData.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return response.json();
}
