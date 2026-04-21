# Vercel Environment Variables Setup

Go to your Vercel project dashboard:
1. Settings -> Environment Variables
2. Add these three variables:

| Name | Value |
|------|-------|
| VITE_NVIDIA_API_KEY | your nvidia nim key |
| VITE_SUPABASE_URL | your supabase project url |
| VITE_SUPABASE_ANON_KEY | your supabase anon key |

3. After adding all three, go to Deployments tab
4. Click the three dots on the latest deployment -> Redeploy
5. The app will now work on the live URL.
