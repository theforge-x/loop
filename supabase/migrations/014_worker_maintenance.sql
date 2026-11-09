CREATE FUNCTION public.prune_request_limits()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n bigint;
BEGIN
 DELETE FROM private.request_rate_limits WHERE expires_at<now()-interval '1 day';
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.prune_request_limits() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prune_request_limits() TO service_role;
