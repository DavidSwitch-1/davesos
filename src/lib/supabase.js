import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xkcvojqtgsipfbbaokrt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrY3ZvanF0Z3NpcGZiYmFva3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTYyNzIsImV4cCI6MjA5MTY3MjI3Mn0.9IhjHaAfdb0SIIQr5ZzPGFb5jF6tqdKaoIO7n2j4rRk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function fetchRows(table, userId) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) console.error(`fetchRows ${table}:`, error);
  return data || [];
}

export async function upsertRow(table, row) {
  const { data, error } = await supabase.from(table).upsert(row).select();
  if (error) console.error(`upsertRow ${table}:`, error);
  return data?.[0];
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) console.error(`deleteRow ${table}:`, error);
}

export async function updateRow(table, id, updates) {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
  if (error) console.error(`updateRow ${table}:`, error);
  return data?.[0];
}
