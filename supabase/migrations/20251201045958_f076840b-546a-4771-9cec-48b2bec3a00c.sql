-- Update the handle_new_user function to include birth_date
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    phone,
    street_address,
    city,
    state,
    zip_code,
    country,
    birth_date
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'street_address',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'zip_code',
    COALESCE(new.raw_user_meta_data->>'country', 'United States'),
    (new.raw_user_meta_data->>'birth_date')::date
  );
  RETURN new;
END;
$function$;