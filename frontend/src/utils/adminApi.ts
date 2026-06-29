import { supabase } from '../supabaseClient';

export async function adminFetch(path: string, _token: string | null, options: RequestInit = {}) {
  const reqBody = options.body ? JSON.parse(options.body as string) : undefined;

  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: {
      path,
      method: options.method || 'GET',
      data: reqBody
    }
  });

  if (error) {
    let errorMsg = error.message;
    if ('context' in error) {
      try {
        const bodyText = await (error as any).context.text();
        const parsed = JSON.parse(bodyText);
        errorMsg = parsed.error || parsed.message || errorMsg;
      } catch {
        // Fallback to default message
      }
    }
    throw new Error(errorMsg || 'Edge Function Invocation Error');
  }

  return data;
}
