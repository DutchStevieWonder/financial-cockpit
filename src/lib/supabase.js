import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bmmezlxwbnhycmowkkag.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtbWV6bHh3Ym5oeWNtb3dra2FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDUyNTAsImV4cCI6MjA5MDI4MTI1MH0.Nu3XpccJP3diBXulzuXMOG0UoPtoVyp_EGIRY28zhXk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
