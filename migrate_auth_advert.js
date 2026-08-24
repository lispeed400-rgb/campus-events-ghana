const { Client } = require('pg');

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function migrate() {
    console.log('🚀 Running database schema update for Auth & Advert Requests...');
    const client = new Client({ connectionString: DB_CONN, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // 1. Ensure campus_users table exists with all columns
        await client.query(`
            CREATE TABLE IF NOT EXISTS campus_users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'STUDENT',
                full_name TEXT NOT NULL,
                university TEXT NOT NULL,
                phone TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Checked/created campus_users table');

        // 2. Create campus_advert_requests table
        await client.query(`
            CREATE TABLE IF NOT EXISTS campus_advert_requests (
                id SERIAL PRIMARY KEY,
                ref_code TEXT UNIQUE NOT NULL,
                organizer_name TEXT NOT NULL,
                organization_name TEXT,
                organizer_email TEXT NOT NULL,
                organizer_phone TEXT NOT NULL,
                university TEXT NOT NULL,
                event_title TEXT NOT NULL,
                event_category TEXT NOT NULL,
                expected_attendance INTEGER DEFAULT 100,
                event_date TIMESTAMP WITH TIME ZONE,
                venue TEXT,
                advert_package TEXT NOT NULL DEFAULT 'Standard Banner',
                poster_url TEXT,
                description TEXT,
                status TEXT DEFAULT 'PENDING',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Checked/created campus_advert_requests table');

        console.log('🎉 Migration successful!');
    } catch (err) {
        console.error('❌ Migration Error:', err);
    } finally {
        await client.end();
    }
}

migrate();
