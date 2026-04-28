UPDATE public.sessions
SET
  status = 'accepted',
  issue_description = '1a8d9d22-5356-49c2-8f4c-c1d36b2e0936',
  categories = ARRAY['Gaming: Valorant','1a8d9d22-5356-49c2-8f4c-c1d36b2e0936']::text[]
WHERE id = '5d79bb5e-0ac3-4044-b421-d51010cec439';