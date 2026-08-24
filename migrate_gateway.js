const { Pool } = require('pg');

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({
    connectionString: DB_CONN,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 6000
});

async function migrateGateway() {
    console.log('📌 Starting Gateway Database Migration...');
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS campus_gateway_transactions (
                id SERIAL PRIMARY KEY,
                gateway_ref VARCHAR(64) UNIQUE NOT NULL,
                merchant_ref VARCHAR(128),
                merchant_name VARCHAR(128) DEFAULT 'External Merchant',
                title VARCHAR(255) DEFAULT 'Online Payment',
                customer_email VARCHAR(255) NOT NULL,
                customer_name VARCHAR(255),
                amount_ghs NUMERIC(10,2) NOT NULL,
                callback_url TEXT NOT NULL,
                cancel_url TEXT,
                paystack_ref VARCHAR(128),
                paystack_auth_url TEXT,
                status VARCHAR(32) DEFAULT 'PENDING',
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_gateway_ref ON campus_gateway_transactions (gateway_ref);
            CREATE INDEX IF NOT EXISTS idx_gateway_status ON campus_gateway_transactions (status);
            CREATE INDEX IF NOT EXISTS idx_gateway_merchant_ref ON campus_gateway_transactions (merchant_ref);
        `);
        console.log('✅ campus_gateway_transactions table and indexes created successfully!');
    } catch (err) {
        console.error('❌ Migration Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateGateway();
