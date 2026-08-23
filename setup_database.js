const { Client } = require('pg');

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function initCampusDatabase() {
    console.log('===========================================================');
    console.log('   CAMPUS EVENT MARKETPLACE - DATABASE INITIALIZATION');
    console.log('===========================================================\n');

    const client = new Client({
        connectionString: DB_CONN,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to AWS Supabase PostgreSQL Database!');

        // 1. Users Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS campus_users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'STUDENT', -- 'STUDENT', 'VENDOR', 'ADMIN'
                full_name TEXT,
                university TEXT,
                phone TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created table: campus_users');

        // 2. Vendors Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS campus_vendors (
                id SERIAL PRIMARY KEY,
                user_email TEXT UNIQUE NOT NULL,
                organization_name TEXT NOT NULL,
                university TEXT NOT NULL,
                contact_phone TEXT NOT NULL,
                bio TEXT,
                logo_url TEXT,
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created table: campus_vendors');

        // 3. Events Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS campus_events (
                id SERIAL PRIMARY KEY,
                vendor_email TEXT NOT NULL,
                organization_name TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                venue TEXT NOT NULL,
                university TEXT NOT NULL,
                start_time TIMESTAMP WITH TIME ZONE NOT NULL,
                end_time TIMESTAMP WITH TIME ZONE,
                category TEXT NOT NULL, -- 'PARTY', 'CONCERT', 'SEMINAR', 'SPORTS', 'THEATER'
                poster_url TEXT,
                status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
                is_featured BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created table: campus_events');

        // 4. Ticket Types Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS campus_ticket_types (
                id SERIAL PRIMARY KEY,
                event_id INTEGER NOT NULL REFERENCES campus_events(id) ON DELETE CASCADE,
                tier_name TEXT NOT NULL, -- e.g. 'Regular', 'VIP', 'Early Bird'
                price_ghs NUMERIC(10,2) NOT NULL DEFAULT 0.00,
                capacity INTEGER NOT NULL DEFAULT 100,
                sold_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created table: campus_ticket_types');

        // 5. Orders Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS campus_orders (
                id SERIAL PRIMARY KEY,
                order_ref TEXT UNIQUE NOT NULL,
                buyer_email TEXT NOT NULL,
                event_id INTEGER NOT NULL,
                ticket_type_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                base_amount_ghs NUMERIC(10,2) NOT NULL,
                service_fee_ghs NUMERIC(10,2) NOT NULL,
                total_amount_ghs NUMERIC(10,2) NOT NULL,
                commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
                paystack_ref TEXT UNIQUE,
                status TEXT DEFAULT 'PAID', -- 'PENDING', 'PAID', 'REFUNDED'
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created table: campus_orders');

        // 6. Tickets Table (QR Code Tickets)
        await client.query(`
            CREATE TABLE IF NOT EXISTS campus_tickets (
                id SERIAL PRIMARY KEY,
                ticket_code TEXT UNIQUE NOT NULL, -- e.g. 'TKT-8X92-M3K1'
                qr_hash TEXT UNIQUE NOT NULL,
                order_id INTEGER NOT NULL REFERENCES campus_orders(id) ON DELETE CASCADE,
                event_id INTEGER NOT NULL,
                ticket_type_id INTEGER NOT NULL,
                attendee_email TEXT NOT NULL,
                status TEXT DEFAULT 'VALID', -- 'VALID', 'USED', 'CANCELLED'
                checked_in_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created table: campus_tickets');

        // 7. System Settings Table (Configurable Commission)
        await client.query(`
            CREATE TABLE IF NOT EXISTS campus_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Set default commission percentage = 10.0%
        await client.query(`
            INSERT INTO campus_settings (key, value)
            VALUES ('ticket_commission_percent', '10.0')
            ON CONFLICT (key) DO NOTHING;
        `);
        console.log('✅ Created table: campus_settings (Default 10.0% Commission Configured)');

        // Insert Admin user default
        await client.query(`
            INSERT INTO campus_users (email, password_hash, role, full_name)
            VALUES ('admin@campusevents.gh', 'pbkdf2$admin123', 'ADMIN', 'Platform Administrator')
            ON CONFLICT (email) DO NOTHING;
        `);
        console.log('✅ Inserted default admin account: admin@campusevents.gh');

        // Insert Sample Verified Vendor & Sample Campus Events for instant discovery!
        const vendorCheck = await client.query(`SELECT id FROM campus_vendors WHERE user_email = 'echo_events@legon.edu.gh'`);
        if (vendorCheck.rows.length === 0) {
            await client.query(`
                INSERT INTO campus_vendors (user_email, organization_name, university, contact_phone, bio, is_verified)
                VALUES ('echo_events@legon.edu.gh', 'Echo Campus Ghana', 'UG Legon', '0244123456', 'Official UG Legon Event Organizers', TRUE);
            `);

            const evtRes = await client.query(`
                INSERT INTO campus_events (vendor_email, organization_name, title, description, venue, university, start_time, category, poster_url, status, is_featured)
                VALUES 
                ('echo_events@legon.edu.gh', 'Echo Campus Ghana', 'UG Legon Artiste Night 2026', 'The biggest annual campus concert at UG Legon featuring top Ghana artistes, DJ battles, and food stalls!', 'Legon Sports Stadium', 'UG Legon', NOW() + INTERVAL '5 days', 'CONCERT', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800', 'APPROVED', TRUE),
                ('echo_events@legon.edu.gh', 'Echo Campus Ghana', 'KNUST Hall Week Rave', 'Unforgettable night party with DJ Black and live performances for all KNUST students!', 'Indeco Hall Quadrangle', 'KNUST', NOW() + INTERVAL '7 days', 'PARTY', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800', 'APPROVED', TRUE),
                ('echo_events@legon.edu.gh', 'Echo Campus Ghana', 'UCC Tech & Innovation Summit', 'Annual student tech exhibition, startup pitches, and keynote talks from industry leaders.', 'UCC Main Auditorium', 'UCC', NOW() + INTERVAL '12 days', 'SEMINAR', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', 'APPROVED', FALSE)
                RETURNING id;
            `);

            // Add Ticket Tiers for UG Legon Concert
            const eventId1 = evtRes.rows[0].id;
            await client.query(`
                INSERT INTO campus_ticket_types (event_id, tier_name, price_ghs, capacity, sold_count)
                VALUES 
                ($1, 'Regular', 50.00, 500, 24),
                ($1, 'VIP Front Row', 120.00, 100, 8);
            `, [eventId1]);

            // Add Ticket Tiers for KNUST Rave
            const eventId2 = evtRes.rows[1].id;
            await client.query(`
                INSERT INTO campus_ticket_types (event_id, tier_name, price_ghs, capacity, sold_count)
                VALUES 
                ($1, 'Regular Access', 40.00, 400, 45),
                ($1, 'VIP Fast Pass', 90.00, 80, 12);
            `, [eventId2]);

            console.log('✅ Populated sample campus events and ticket tiers!');
        }

        console.log('\n===========================================================');
        console.log('   🎉 CAMPUS EVENTS DATABASE MIGRATION COMPLETE 100%!');
        console.log('===========================================================');

    } catch (err) {
        console.error('❌ Migration Error:', err);
    } finally {
        await client.end();
    }
}

initCampusDatabase();
