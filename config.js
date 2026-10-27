const SUPABASE_URL = 'https://touyfdmsrxleyoxkiprx.supabase.co';   // Project URL
const SUPABASE_ANON_KEY = 'sb_publishable_h2wieo8h3O5a6CC5_mpCxQ_j1IX1IfL';   // 공개용(anon) 키만. service_role 비밀 키는 절대 넣지 않는다
if (typeof module !== 'undefined') module.exports = { SUPABASE_URL, SUPABASE_ANON_KEY };   // api/kma.js 가 읽을 때만 쓰임
