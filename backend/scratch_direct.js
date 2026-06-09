const { Client } = require('pg');

async function testDirect() {
    const connectionString = `postgresql://postgres:6JVtMwYF4zuaGjXr@[2a05:d016:c4a:9701:9935:9ed0:720b:6297]:5432/postgres`;
    console.log("Connecting directly to db.hhbvzucwwxntpnwlwzva.supabase.co:5432...");
    
    const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
    
    try {
        await client.connect();
        console.log("🎉 SUCCESS! Connected directly to the database.");
        await client.end();
    } catch (err) {
        console.log(`❌ Connection failed: ${err.message}`);
    }
}

testDirect();
