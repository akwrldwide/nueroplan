const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function adminFetch(path: string, token: string | null, options: RequestInit = {}) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(`${API_URL}/api/admin${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `API Error: ${response.status}`);
  }

  return response.json();
}
