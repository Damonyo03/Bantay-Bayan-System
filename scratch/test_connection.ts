
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Read .env.local manually
const envPath = path.resolve('c:/Users/user/Downloads/Projects/Bantay-Bayan-System/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const envVars: any = {};
envLines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];

console.log("Checking Supabase connection...");
console.log("URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
        console.error("Connection Failed!", error);
    } else {
        console.log("Connection Success! Table 'profiles' is reachable.");
    }
}

test();
