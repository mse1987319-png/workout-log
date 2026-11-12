import { supabase } from '../lib/supabase'

/** The numbers and one-line summary of my last 7 days (nothing is saved). */
export async function previewReport() {
  const { data, error } = await supabase.rpc('report_stats', { p_days: 7 })
  if (error) throw error
  return data
}

/**
 * Saves my report (database function send_report). Its INSERT fires the
 * second Database Webhook → Zap 2 → the instructor's email. The database
 * refuses a second report within 5 minutes.
 */
export async function sendReport() {
  const { data, error } = await supabase.rpc('send_report')
  if (error) throw error
  return data
}

/** My most recent report, or null. */
export async function lastReport() {
  const { data, error } = await supabase
    .from('reports')
    .select('created_at, summary')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
