-- Private bucket: publication is enforced by object RLS, never a public bucket bypass.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('wedding-media','wedding-media',false,10485760,ARRAY['image/jpeg','image/png','image/webp','image/avif'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
CREATE FUNCTION public.storage_wedding_id(p_path text)
RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN split_part(p_path,'/',1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN split_part(p_path,'/',1)::uuid ELSE NULL END;
$$;
REVOKE ALL ON FUNCTION public.storage_wedding_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_wedding_id(text) TO anon,authenticated,service_role;
CREATE POLICY wedding_media_read ON storage.objects FOR SELECT TO anon,authenticated
USING(bucket_id='wedding-media' AND (
 public.has_wedding_role(public.storage_wedding_id(name)) OR
 EXISTS(SELECT 1 FROM public.media_assets a WHERE a.bucket_id=objects.bucket_id AND a.object_path=objects.name AND a.is_published AND public.is_published_wedding(a.wedding_id))));
CREATE POLICY wedding_media_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='wedding-media' AND public.has_wedding_role(public.storage_wedding_id(name),ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY wedding_media_update ON storage.objects FOR UPDATE TO authenticated
USING(bucket_id='wedding-media' AND public.has_wedding_role(public.storage_wedding_id(name),ARRAY['owner','admin','coordinator']::public.member_role[]))
WITH CHECK(bucket_id='wedding-media' AND public.has_wedding_role(public.storage_wedding_id(name),ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY wedding_media_delete ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='wedding-media' AND public.has_wedding_role(public.storage_wedding_id(name),ARRAY['owner','admin','coordinator']::public.member_role[]));
