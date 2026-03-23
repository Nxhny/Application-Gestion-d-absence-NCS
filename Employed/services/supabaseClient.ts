import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzfopvgpkosivuajrrdw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Zm9wdmdwa29zaXZ1YWpycmR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDE2NjYsImV4cCI6MjA3MzE3NzY2Nn0.hnUXtOOgurrJWMx3Yeq4rHsMwUzfOC000hxDjgH5CMk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
