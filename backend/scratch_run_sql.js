const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runSql() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("Missing DATABASE_URL in environment variables.");
        process.exit(1);
    }

    const sqlPath = path.join(__dirname, '..', 'supabase', 'user_sync_trigger.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error(`Missing SQL file at ${sqlPath}`);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log("Connecting to database to execute triggers and procedures...");
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected successfully. Running SQL script...");
        await client.query(sqlContent);
        console.log("🎉 SUCCESS! Database triggers and progression functions created successfully.");
    } catch (err) {
        console.error(`❌ SQL Execution failed: ${err.message}`);
    } finally {
        await client.end();
    }
}

runSql();
