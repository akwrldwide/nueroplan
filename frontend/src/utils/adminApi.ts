import { supabase } from '../supabaseClient';

export async function adminFetch(path: string, _token: string | null, options: RequestInit = {}) {
  let requestData = undefined;
  if (options.body) {
    try {
      requestData = JSON.parse(options.body as string);
    } catch (_) {
      requestData = options.body;
    }
  }

  const method = options.method || 'GET';

  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: {
      path,
      method,
      data: requestData
    }
  });

  if (error) {
    throw new Error(error.message || 'Failed to communicate with admin service');
  }

  if (data && data.error) {
    throw new Error(data.error);
  }

  return data;
}
