drop extension if exists "pg_net";

create extension if not exists "vector" with schema "public";


  create table "public"."admin_config" (
    "key" text not null,
    "value" jsonb not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "updated_by" uuid
      );


alter table "public"."admin_config" enable row level security;


  create table "public"."conversations" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text,
    "conversation_items" jsonb not null,
    "chat_messages" jsonb not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_publicly_shareable" boolean default false
      );


alter table "public"."conversations" enable row level security;


  create table "public"."snippets" (
    "id" text not null,
    "content" text not null,
    "created_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone,
    "view_count" integer default 0
      );


alter table "public"."snippets" enable row level security;


  create table "public"."user_queries" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid,
    "query_timestamp" timestamp with time zone default now(),
    "query_type" text not null
      );


alter table "public"."user_queries" enable row level security;


  create table "public"."vector_store_config" (
    "key" text not null,
    "store_id" text,
    "store_name" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."vector_store_config" enable row level security;

CREATE INDEX admin_config_key_idx ON public.admin_config USING btree (key);

CREATE UNIQUE INDEX admin_config_pkey ON public.admin_config USING btree (key);

CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id);

CREATE INDEX conversations_updated_at_idx ON public.conversations USING btree (updated_at DESC);

CREATE INDEX conversations_user_id_idx ON public.conversations USING btree (user_id);

CREATE INDEX idx_user_queries_timestamp ON public.user_queries USING btree (query_timestamp);

CREATE INDEX idx_user_queries_user_id ON public.user_queries USING btree (user_id);

CREATE UNIQUE INDEX snippets_pkey ON public.snippets USING btree (id);

CREATE UNIQUE INDEX user_queries_pkey ON public.user_queries USING btree (id);

CREATE UNIQUE INDEX vector_store_config_pkey ON public.vector_store_config USING btree (key);

alter table "public"."admin_config" add constraint "admin_config_pkey" PRIMARY KEY using index "admin_config_pkey";

alter table "public"."conversations" add constraint "conversations_pkey" PRIMARY KEY using index "conversations_pkey";

alter table "public"."snippets" add constraint "snippets_pkey" PRIMARY KEY using index "snippets_pkey";

alter table "public"."user_queries" add constraint "user_queries_pkey" PRIMARY KEY using index "user_queries_pkey";

alter table "public"."vector_store_config" add constraint "vector_store_config_pkey" PRIMARY KEY using index "vector_store_config_pkey";

alter table "public"."admin_config" add constraint "admin_config_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."admin_config" validate constraint "admin_config_updated_by_fkey";

alter table "public"."conversations" add constraint "conversations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."conversations" validate constraint "conversations_user_id_fkey";

alter table "public"."user_queries" add constraint "user_queries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_queries" validate constraint "user_queries_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ 

BEGIN

  DELETE FROM public.email_verification_tokens

  WHERE expires_at < NOW();

  RETURN NULL;

END;

$function$
;

CREATE OR REPLACE FUNCTION public.get_all_conversations_metadata()
 RETURNS TABLE(id uuid, user_id uuid, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

   BEGIN

     RETURN QUERY

     SELECT

       c.id,

       c.user_id,

       c.updated_at

     FROM conversations c

     ORDER BY c.updated_at DESC;

   END;

   $function$
;

CREATE OR REPLACE FUNCTION public.get_all_users_with_metadata()
 RETURNS TABLE(id uuid, email text, display_name text, phone text, last_sign_in_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

BEGIN

  RETURN QUERY

  SELECT 

    au.id,

    au.email::TEXT,

    COALESCE(

      au.raw_user_meta_data->>'full_name',

      au.raw_user_meta_data->>'display_name',

      au.email::TEXT

    )::TEXT as display_name,

    COALESCE(

      au.phone::TEXT,

      au.raw_user_meta_data->>'phone',

      ''

    )::TEXT as phone,

    au.last_sign_in_at

  FROM auth.users au

  ORDER BY au.created_at DESC;

END;

$function$
;

CREATE OR REPLACE FUNCTION public.get_conversation_for_admin(p_conversation_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, title text, conversation_items jsonb, chat_messages jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

BEGIN

  RETURN QUERY

  SELECT 

    c.id,

    c.user_id,

    c.title,

    c.conversation_items,

    c.chat_messages,

    c.created_at,

    c.updated_at

  FROM conversations c

  WHERE c.id = p_conversation_id;

END;

$function$
;

CREATE OR REPLACE FUNCTION public.get_mandatory_search_domains()
 RETURNS TABLE(domain text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

BEGIN

  RETURN QUERY

  SELECT d.domain 

  FROM domains d

  JOIN mandatory_search_domains msd ON d.id = msd.domain_id;

END;

$function$
;

CREATE OR REPLACE FUNCTION public.get_user_conversations_for_admin(p_user_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, title text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

BEGIN

  RETURN QUERY

  SELECT 

    c.id,

    c.user_id,

    c.title,

    c.created_at,

    c.updated_at

  FROM conversations c

  WHERE c.user_id = p_user_id

  ORDER BY c.updated_at DESC;

END;

$function$
;

CREATE OR REPLACE FUNCTION public.get_users_with_conversations(user_ids uuid[])
 RETURNS TABLE(id uuid, email text, display_name text, phone text, last_sign_in_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

BEGIN

  RETURN QUERY

  SELECT 

    au.id,

    au.email::TEXT,

    COALESCE(

      au.raw_user_meta_data->>'full_name',

      au.raw_user_meta_data->>'display_name',

      au.email::TEXT

    )::TEXT as display_name,

    COALESCE(

      au.phone::TEXT,

      au.raw_user_meta_data->>'phone',

      ''

    )::TEXT as phone,

    au.last_sign_in_at

  FROM auth.users au

  WHERE au.id = ANY(user_ids)

  ORDER BY au.last_sign_in_at DESC NULLS LAST;

END;

$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE

  user_email TEXT;

  is_admin BOOLEAN;

BEGIN

  -- Get the email of the current user

  SELECT email INTO user_email 

  FROM auth.users 

  WHERE id = auth.uid();

  

  -- Check if the user's email is in the admin list

  -- This matches the same check used in the admin config policy

  SELECT EXISTS (

    SELECT 1 

    FROM admin_config 

    WHERE key = 'admin_emails' 

    AND value::text LIKE '%' || user_email || '%'

  ) INTO is_admin;

  

  -- Also check if the user is a service role (for server-side operations)

  IF NOT is_admin THEN

    SELECT current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' INTO is_admin;

  END IF;

  

  RETURN COALESCE(is_admin, FALSE);

END;

$function$
;

CREATE OR REPLACE FUNCTION public.reset_query_limits()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE

  deleted_count integer;

BEGIN

  -- Delete all records from user_queries table

  DELETE FROM public.user_queries

  WHERE user_id IS NOT NULL;

  

  -- Get the number of deleted rows

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  

  -- Return the count of deleted rows

  RETURN deleted_count;

END;

$function$
;

CREATE OR REPLACE FUNCTION public.update_admin_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

BEGIN

  NEW.updated_at = NOW();

  NEW.updated_by = auth.uid();

  RETURN NEW;

END;

$function$
;

CREATE OR REPLACE FUNCTION public.update_domains_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

BEGIN

  NEW.updated_at = NOW();

  RETURN NEW;

END;

$function$
;

CREATE OR REPLACE FUNCTION public.update_mandatory_search_domains_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

BEGIN

  NEW.updated_at = NOW();

  RETURN NEW;

END;

$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

begin

  new.updated_at = timezone('utc', now());

  return new;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.update_user_phone(user_id uuid, phone_number text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

begin

  update auth.users

  set phone = phone_number

  where id = user_id;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.verify_user_email(token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$ 

DECLARE

  token_record RECORD;

  user_record RECORD;

BEGIN

  -- Get the token

  SELECT * INTO token_record

  FROM public.email_verification_tokens

  WHERE token = $1

  AND expires_at > NOW()

  LIMIT 1;



  IF token_record IS NULL THEN

    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired token');

  END IF;



  -- Get the user

  SELECT * INTO user_record

  FROM auth.users

  WHERE id = token_record.user_id

  LIMIT 1;



  IF user_record IS NULL THEN

    RETURN jsonb_build_object('success', false, 'message', 'User not found');

  END IF;



  -- Update user email verified status

  UPDATE auth.users

  SET email_confirmed_at = NOW()

  WHERE id = token_record.user_id;



  -- Delete the used token

  DELETE FROM public.email_verification_tokens

  WHERE id = token_record.id;



  RETURN jsonb_build_object('success', true, 'message', 'Email verified successfully');

EXCEPTION WHEN OTHERS THEN

  RETURN jsonb_build_object('success', false, 'message', SQLERRM);

END;

$function$
;

grant delete on table "public"."admin_config" to "anon";

grant insert on table "public"."admin_config" to "anon";

grant references on table "public"."admin_config" to "anon";

grant select on table "public"."admin_config" to "anon";

grant trigger on table "public"."admin_config" to "anon";

grant truncate on table "public"."admin_config" to "anon";

grant update on table "public"."admin_config" to "anon";

grant delete on table "public"."admin_config" to "authenticated";

grant insert on table "public"."admin_config" to "authenticated";

grant references on table "public"."admin_config" to "authenticated";

grant select on table "public"."admin_config" to "authenticated";

grant trigger on table "public"."admin_config" to "authenticated";

grant truncate on table "public"."admin_config" to "authenticated";

grant update on table "public"."admin_config" to "authenticated";

grant delete on table "public"."admin_config" to "service_role";

grant insert on table "public"."admin_config" to "service_role";

grant references on table "public"."admin_config" to "service_role";

grant select on table "public"."admin_config" to "service_role";

grant trigger on table "public"."admin_config" to "service_role";

grant truncate on table "public"."admin_config" to "service_role";

grant update on table "public"."admin_config" to "service_role";

grant delete on table "public"."conversations" to "anon";

grant insert on table "public"."conversations" to "anon";

grant references on table "public"."conversations" to "anon";

grant select on table "public"."conversations" to "anon";

grant trigger on table "public"."conversations" to "anon";

grant truncate on table "public"."conversations" to "anon";

grant update on table "public"."conversations" to "anon";

grant delete on table "public"."conversations" to "authenticated";

grant insert on table "public"."conversations" to "authenticated";

grant references on table "public"."conversations" to "authenticated";

grant select on table "public"."conversations" to "authenticated";

grant trigger on table "public"."conversations" to "authenticated";

grant truncate on table "public"."conversations" to "authenticated";

grant update on table "public"."conversations" to "authenticated";

grant delete on table "public"."conversations" to "service_role";

grant insert on table "public"."conversations" to "service_role";

grant references on table "public"."conversations" to "service_role";

grant select on table "public"."conversations" to "service_role";

grant trigger on table "public"."conversations" to "service_role";

grant truncate on table "public"."conversations" to "service_role";

grant update on table "public"."conversations" to "service_role";

grant delete on table "public"."snippets" to "anon";

grant insert on table "public"."snippets" to "anon";

grant references on table "public"."snippets" to "anon";

grant select on table "public"."snippets" to "anon";

grant trigger on table "public"."snippets" to "anon";

grant truncate on table "public"."snippets" to "anon";

grant update on table "public"."snippets" to "anon";

grant delete on table "public"."snippets" to "authenticated";

grant insert on table "public"."snippets" to "authenticated";

grant references on table "public"."snippets" to "authenticated";

grant select on table "public"."snippets" to "authenticated";

grant trigger on table "public"."snippets" to "authenticated";

grant truncate on table "public"."snippets" to "authenticated";

grant update on table "public"."snippets" to "authenticated";

grant delete on table "public"."snippets" to "service_role";

grant insert on table "public"."snippets" to "service_role";

grant references on table "public"."snippets" to "service_role";

grant select on table "public"."snippets" to "service_role";

grant trigger on table "public"."snippets" to "service_role";

grant truncate on table "public"."snippets" to "service_role";

grant update on table "public"."snippets" to "service_role";

grant delete on table "public"."user_queries" to "anon";

grant insert on table "public"."user_queries" to "anon";

grant references on table "public"."user_queries" to "anon";

grant select on table "public"."user_queries" to "anon";

grant trigger on table "public"."user_queries" to "anon";

grant truncate on table "public"."user_queries" to "anon";

grant update on table "public"."user_queries" to "anon";

grant delete on table "public"."user_queries" to "authenticated";

grant insert on table "public"."user_queries" to "authenticated";

grant references on table "public"."user_queries" to "authenticated";

grant select on table "public"."user_queries" to "authenticated";

grant trigger on table "public"."user_queries" to "authenticated";

grant truncate on table "public"."user_queries" to "authenticated";

grant update on table "public"."user_queries" to "authenticated";

grant delete on table "public"."user_queries" to "service_role";

grant insert on table "public"."user_queries" to "service_role";

grant references on table "public"."user_queries" to "service_role";

grant select on table "public"."user_queries" to "service_role";

grant trigger on table "public"."user_queries" to "service_role";

grant truncate on table "public"."user_queries" to "service_role";

grant update on table "public"."user_queries" to "service_role";

grant delete on table "public"."vector_store_config" to "anon";

grant insert on table "public"."vector_store_config" to "anon";

grant references on table "public"."vector_store_config" to "anon";

grant select on table "public"."vector_store_config" to "anon";

grant trigger on table "public"."vector_store_config" to "anon";

grant truncate on table "public"."vector_store_config" to "anon";

grant update on table "public"."vector_store_config" to "anon";

grant delete on table "public"."vector_store_config" to "authenticated";

grant insert on table "public"."vector_store_config" to "authenticated";

grant references on table "public"."vector_store_config" to "authenticated";

grant select on table "public"."vector_store_config" to "authenticated";

grant trigger on table "public"."vector_store_config" to "authenticated";

grant truncate on table "public"."vector_store_config" to "authenticated";

grant update on table "public"."vector_store_config" to "authenticated";

grant delete on table "public"."vector_store_config" to "service_role";

grant insert on table "public"."vector_store_config" to "service_role";

grant references on table "public"."vector_store_config" to "service_role";

grant select on table "public"."vector_store_config" to "service_role";

grant trigger on table "public"."vector_store_config" to "service_role";

grant truncate on table "public"."vector_store_config" to "service_role";

grant update on table "public"."vector_store_config" to "service_role";


  create policy "Allow authenticated users to read"
  on "public"."admin_config"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to write"
  on "public"."admin_config"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow public access to shareable conversations"
  on "public"."conversations"
  as permissive
  for select
  to public
using ((is_publicly_shareable = true));



  create policy "Users can delete their own conversations"
  on "public"."conversations"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own conversations"
  on "public"."conversations"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own conversations"
  on "public"."conversations"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view their own conversations"
  on "public"."conversations"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "public_insert"
  on "public"."snippets"
  as permissive
  for insert
  to public
with check (true);



  create policy "public_read"
  on "public"."snippets"
  as permissive
  for select
  to public
using (true);



  create policy "Enable insert for authenticated users only"
  on "public"."user_queries"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable read access for users based on user_id"
  on "public"."user_queries"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "vector store config delete"
  on "public"."vector_store_config"
  as permissive
  for delete
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "vector store config read"
  on "public"."vector_store_config"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "vector store config update"
  on "public"."vector_store_config"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "vector store config upsert"
  on "public"."vector_store_config"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));


CREATE TRIGGER update_admin_config_updated_at BEFORE UPDATE ON public.admin_config FOR EACH ROW EXECUTE FUNCTION public.update_admin_config_updated_at();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vector_store_config_updated_at BEFORE UPDATE ON public.vector_store_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


