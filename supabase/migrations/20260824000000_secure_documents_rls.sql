-- RGPD: eliminar acceso público a documentos clínicos
-- service_role bypasa RLS, el backend sigue funcionando sin políticas
DROP POLICY IF EXISTS "Allow all authenticated" ON public.documents;
DROP POLICY IF EXISTS "Allow anon read" ON public.documents;
DROP POLICY IF EXISTS "Allow public all on documents" ON public.documents;
DROP POLICY IF EXISTS "Allow anon and authenticated all" ON public.documents;
