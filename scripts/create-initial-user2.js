#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://zsmloaboaewjgcocozjd.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbWxvYWJvYWV3amdjb2NvempkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAzMzU5MCwiZXhwIjoyMDg3NjA5NTkwfQ.4QaQ3C2yDedMPDkiQqX4SCZP8ozG1id3eHrdqZsYKNE";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createInitialUser() {
  const phoneNumber = "+918618899847";
  const password = "Manager@123";
  const fullName = "System Manager";

  console.log("Creating initial collection-manager user...");
  console.log(`Phone: ${phoneNumber}`);
  console.log(`Password: ${password}`);
  console.log(`Name: ${fullName}`);

  const { data, error } = await supabase.auth.admin.createUser({
    // or use email instead of phone if you prefer
    phone: phoneNumber,
    password,
    phone_confirm: true,
    user_metadata: {
      role: "collection_manager",
      phone_number: "8618899847",
      full_name: fullName,
    },
  });

  if (error) {
    console.error("Error creating user:", error.message);
    process.exit(1);
  }

  console.log("\n✅ Initial collection-manager user created successfully!");
  console.log("User id:", data.user.id);
}

createInitialUser();
