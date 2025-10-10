-- Pin search_path for both helper functions
alter function public.ppp_session_id()         set search_path = pg_temp, public;
alter function public.require_ppp_session_id() set search_path = pg_temp, public;