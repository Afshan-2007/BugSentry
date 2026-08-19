/*
# Harden database functions

## Overview
Fixes security advisor warnings:
1. Sets explicit search_path on all SECURITY DEFINER functions to prevent search_path hijacking
2. Revokes EXECUTE from anon and authenticated on the trigger function handle_new_user
   (it should only run via the auth.users trigger, not be callable via the REST API)

## Changes
- ALTER FUNCTION ... SET search_path = public, auth
- REVOKE EXECUTE ON handle_new_user FROM anon, authenticated
*/

ALTER FUNCTION public.is_admin() SET search_path = public, auth;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
ALTER FUNCTION public.set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
