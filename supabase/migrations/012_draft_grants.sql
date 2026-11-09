-- Supabase installs broad default table grants. Drafts must have no anonymous grants at all.
REVOKE ALL ON public.content_drafts FROM anon;
