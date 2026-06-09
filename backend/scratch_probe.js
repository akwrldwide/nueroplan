const { Client } = require('pg');

const regions = [
    'eu-north-1', 'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3',
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
    'ca-central-1', 'sa-east-1', 'me-central-1', 'af-south-1'
];

async function probe() {
    for (const region of regions) {
        const host = `aws-0-${region}.pooler.supabase.com`;
        const connectionString = `postgresql://postgres.hhbvzucwwxntpnwlwzva:6JVtMwYF4zuaGjXr@${host}:6543/postgres`;
        
        console.log(`Probing ${region}...`);
        const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
        
        try {
            await client.connect();
            console.log(`\n🎉 SUCCESS! Connected to ${region} successfully.`);
            await client.end();
            process.exit(0);
        } catch (err) {
            if (err.message.includes('password authentication failed')) {
                console.log(`\n🎯 FOUND REGION: ${region} (Tenant recognized, authentication failed).`);
                client.end();
                process.exit(0);
            } else if (err.message.includes('tenant/user') && err.message.includes('not found')) {
                // Expected if region is wrong
            } else {
                console.log(`Error on ${region}: ${err.message}`);
            }
        }
    }
    console.log('\n❌ Probing complete. Region not found.');
}

probe();
