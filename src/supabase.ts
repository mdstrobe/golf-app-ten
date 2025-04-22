// src/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cwjcfzpabasfxwcxsvfn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3amNmenBhYmFzZnh3Y3hzdmZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyODQ1MjksImV4cCI6MjA2MDg2MDUyOX0.v17pquVaZ0reSwYmD1L-E0huEVmIDRl0zaNJXFF3GlM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);