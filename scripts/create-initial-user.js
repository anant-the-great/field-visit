#!/usr/bin/env node

/**
 * Script to create an initial collection-manager user in the database
 * Run with: node scripts/create-initial-user.js
 */

const { createClient } = require("@supabase/supabase-js");
const bcryptjs = require("bcryptjs");

// const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_URL = "https://zsmloaboaewjgcocozjd.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbWxvYWJvYWV3amdjb2NvempkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzM1OTAsImV4cCI6MjA4NzYwOTU5MH0.vh9q-kNCOTcE3esuPPoNiXmW6FrHgWeciUlusOd7qGY";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars are required",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createInitialUser() {
  try {
    // Default credentials for initial user
    const phoneNumber = "+918618899847";
    const password = "Manager@123";
    const fullName = "System Manager";

    console.log("Creating initial collection-manager user...");
    console.log(`Phone: ${phoneNumber}`);
    console.log(`Password: ${password}`);
    console.log(`Name: ${fullName}`);

    // Hash the password
    const passwordHash = await bcryptjs.hash(password, 10);

    // Insert the user
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          phone_number: phoneNumber,
          full_name: fullName,
          password_hash: passwordHash,
          role: "collection_manager",
          is_active: true,
        },
      ])
      .select();

    if (error) {
      console.error("Error creating user:", error.message);
      process.exit(1);
    }

    console.log("\n✅ Initial collection-manager user created successfully!");
    console.log("\nLogin credentials:");
    console.log(`Phone: ${phoneNumber}`);
    console.log(`Password: ${password}`);
    console.log("\n⚠️  IMPORTANT: Change this password after first login!");
  } catch (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  }
}

createInitialUser();
