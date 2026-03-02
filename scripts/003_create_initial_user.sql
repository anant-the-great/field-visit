-- Insert initial collection-manager user
-- Password: Manager@123 (bcrypt hash with cost 10)
-- Phone: +1234567890
ALTER TABLE public.users
ADD COLUMN password_hash TEXT;

INSERT INTO public.users (id, phone_number, full_name, password_hash, role, is_active)
VALUES (
  gen_random_uuid(),
  '8618899847',
  'Anant',
  '$2a$10$YourHashedPasswordHere',
  'collection_manager',
  true
)
ON CONFLICT (phone_number) DO NOTHING;

-- Note: The hash above is a placeholder. Use one of these methods to get a real bcrypt hash:
-- 
-- Method 1: Use the Node.js script
--   node scripts/create-initial-user.js
--
-- Method 2: Generate hash online at https://bcrypt-generator.com/
--   Input password: Manager@123
--   Rounds: 10
--   Copy the resulting hash and replace '$2a$10$YourHashedPasswordHere' above
--
-- Method 3: Use this bcryptjs hash for "Manager@123":
--   $2a$10$kvPZaFvMWEY4N3c1O4xTSusRDhDVqIQ3B5EO6j8v9GVhKhV7OT19K
