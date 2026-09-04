import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const { userId, title, body, data } = await req.json();

  const { data: profile } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', userId)
    .single();

  if (!profile?.push_token) {
    return new Response(JSON.stringify({ sent: false, reason: 'No push token' }), { status: 200 });
  }

  const message = {
    to: profile.push_token,
    sound: 'default',
    title,
    body,
    data: data || {},
  };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  const result = await response.json();
  return new Response(JSON.stringify({ sent: true, result }), { status: 200 });
});
