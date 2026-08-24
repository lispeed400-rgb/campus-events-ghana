const { Pool } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString: DB_CONN, ssl: { rejectUnauthorized: false } });

const EVENTS = [
    {
        vendor_email: 'events@uglegon.edu.gh',
        organization_name: 'UG SRC Entertainment',
        title: 'Legon Hall Week Concert 2024',
        description: 'The biggest annual concert on Legon campus! Live performances from top Ghanaian artists including Sarkodie, Black Sherif, and KiDi. Dress code: Afro-elegance.',
        venue: 'Great Hall, UG Legon',
        university: 'UG Legon',
        start_time: '2024-10-18T20:00:00Z',
        category: 'CONCERT',
        poster_url: 'https://images.unsplash.com/photo-1501386761578-eaa54b292f73?w=800&q=80',
        status: 'APPROVED',
        tiers: [
            { name: 'Early Bird', price: 40, capacity: 300 },
            { name: 'Regular', price: 70, capacity: 500 },
            { name: 'VIP', price: 150, capacity: 100 }
        ]
    },
    {
        vendor_email: 'knust.events@knust.edu.gh',
        organization_name: 'KNUST SRC',
        title: 'KNUST Tech Summit 2024',
        description: 'Ghana\'s premier student tech summit. Keynotes from Google, Microsoft & local tech startups. Hackathon, workshops, networking sessions and pitch competitions. Win up to GHS 5,000!',
        venue: 'KNUST Council Chamber, Kumasi',
        university: 'KNUST',
        start_time: '2024-10-25T09:00:00Z',
        category: 'SEMINAR',
        poster_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
        status: 'APPROVED',
        tiers: [
            { name: 'Student Pass', price: 20, capacity: 400 },
            { name: 'Professional', price: 80, capacity: 150 },
            { name: 'VIP All-Access', price: 200, capacity: 50 }
        ]
    },
    {
        vendor_email: 'ucc.hall@ucc.edu.gh',
        organization_name: 'UCC Valco Hall',
        title: 'Valco Hall Rave – Halloween Edition',
        description: 'Spooky, electric, unforgettable. Costume contest with GHS 2,000 prize. DJs: DJ Fah, DJ Loft. Drinks & snacks available. Halloween themed décor and light show.',
        venue: 'Valco Hall Courtyard, UCC',
        university: 'UCC',
        start_time: '2024-10-31T21:00:00Z',
        category: 'PARTY',
        poster_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
        status: 'APPROVED',
        tiers: [
            { name: 'Early Bird', price: 25, capacity: 200 },
            { name: 'Regular', price: 40, capacity: 400 },
            { name: 'Table (x4)', price: 200, capacity: 30 }
        ]
    },
    {
        vendor_email: 'upsa.biz@upsa.edu.gh',
        organization_name: 'UPSA Business Club',
        title: 'Entrepreneurship & Finance Forum 2024',
        description: 'Three sessions: raising seed capital, fintech disruption in Africa, and building your personal brand. Keynote by CEO of MTN Ghana. Certificate of participation.',
        venue: 'UPSA Auditorium, Accra',
        university: 'UPSA',
        start_time: '2024-11-08T10:00:00Z',
        category: 'SEMINAR',
        poster_url: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800&q=80',
        status: 'APPROVED',
        tiers: [
            { name: 'Student', price: 15, capacity: 300 },
            { name: 'Alumni / Professional', price: 60, capacity: 100 }
        ]
    },
    {
        vendor_email: 'ashesi.arts@ashesi.edu.gh',
        organization_name: 'Ashesi Arts Collective',
        title: 'Ashesi Music Night – Unplugged',
        description: 'An intimate acoustic night featuring Ashesi\'s top student performers. Afrobeat, highlife, jazz, and spoken word. Limited seats — get yours early!',
        venue: 'Ashesi Performance Space, Berekuso',
        university: 'Ashesi',
        start_time: '2024-11-15T19:00:00Z',
        category: 'CONCERT',
        poster_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
        status: 'APPROVED',
        tiers: [
            { name: 'General', price: 30, capacity: 100 },
            { name: 'Front Row', price: 70, capacity: 40 }
        ]
    },
    {
        vendor_email: 'knust.vibe@knust.edu.gh',
        organization_name: 'KNUST Vibe Entertainment',
        title: 'End of Semester Rave – KNUST',
        description: 'KNUST\'s most anticipated semester-end party. 3 DJs, 2 stages, food vendors, and a vibe that goes till dawn. Dress code: All Black.',
        venue: 'KNUST Recreation Centre',
        university: 'KNUST',
        start_time: '2024-11-29T22:00:00Z',
        category: 'PARTY',
        poster_url: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80',
        status: 'APPROVED',
        tiers: [
            { name: 'Early Bird', price: 35, capacity: 250 },
            { name: 'Regular', price: 55, capacity: 500 },
            { name: 'VIP Lounge', price: 130, capacity: 80 }
        ]
    },
    {
        vendor_email: 'ug.coding@ug.edu.gh',
        organization_name: 'UG Computer Science Society',
        title: 'AI & Data Science Bootcamp',
        description: 'Hands-on 2-day bootcamp. Day 1: Machine Learning fundamentals with Python. Day 2: Build and deploy your own AI model. Laptops required. Certificate included.',
        venue: 'Computer Science Block, UG Legon',
        university: 'UG Legon',
        start_time: '2024-11-23T08:30:00Z',
        category: 'SEMINAR',
        poster_url: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80',
        status: 'APPROVED',
        tiers: [
            { name: 'Student (2 days)', price: 50, capacity: 120 },
            { name: 'Professional (2 days)', price: 120, capacity: 40 }
        ]
    },
    {
        vendor_email: 'ucc.carnival@ucc.edu.gh',
        organization_name: 'UCC SRC Entertainment',
        title: 'UCC Christmas Carnival & Concert',
        description: 'Celebrate the end of year with Ghana\'s biggest student carnival. Live band, artists, carnival rides, food fest, comedy and prize giveaways.',
        venue: 'Independence Hall Grounds, UCC',
        university: 'UCC',
        start_time: '2024-12-06T17:00:00Z',
        category: 'CONCERT',
        poster_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
        status: 'APPROVED',
        tiers: [
            { name: 'Early Bird', price: 30, capacity: 300 },
            { name: 'Regular', price: 60, capacity: 600 },
            { name: 'VIP + Meet & Greet', price: 180, capacity: 60 }
        ]
    },
    {
        vendor_email: 'upsa.xmas@upsa.edu.gh',
        organization_name: 'UPSA Students Association',
        title: 'UPSA Yuletide Night 2024',
        description: 'Accra\'s hottest student Christmas party. Afrobeats meets house music. Celebrity DJ, cocktail bar, and Instagram photo booth. Dress to impress!',
        venue: 'UPSA Amphitheatre, East Legon',
        university: 'UPSA',
        start_time: '2024-12-13T21:00:00Z',
        category: 'PARTY',
        poster_url: 'https://images.unsplash.com/photo-1575389168956-03c5f1d57ca8?w=800&q=80',
        status: 'APPROVED',
        tiers: [
            { name: 'General', price: 50, capacity: 400 },
            { name: 'VIP Booth (x5)', price: 400, capacity: 20 }
        ]
    },
    {
        vendor_email: 'ashesi.nye@ashesi.edu.gh',
        organization_name: 'Ashesi Student Government',
        title: 'New Year\'s Eve Rooftop Bash',
        description: 'Ring in 2025 on the Ashesi rooftop. Champagne toast at midnight, live DJ, 360° bonfire, and a night you\'ll never forget. Limited to 200 guests only.',
        venue: 'Ashesi Rooftop Terrace, Berekuso',
        university: 'Ashesi',
        start_time: '2024-12-31T20:00:00Z',
        category: 'PARTY',
        poster_url: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&q=80',
        status: 'APPROVED',
        tiers: [
            { name: 'Standard', price: 80, capacity: 140 },
            { name: 'Premium + Champagne', price: 180, capacity: 60 }
        ]
    }
];

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    // Simple secret guard — only allow with ?seed_key=campus2024
    const params = event.queryStringParameters || {};
    if (params.seed_key !== 'campus2024') {
        return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Forbidden. Provide seed_key.' }) };
    }

    let client;
    try {
        client = await pool.connect();
        let inserted = 0;
        let skipped = 0;

        for (const ev of EVENTS) {
            // Check if this event already exists by title
            const existing = await client.query(
                `SELECT id FROM campus_events WHERE title = $1`, [ev.title]
            );
            if (existing.rows.length > 0) {
                skipped++;
                continue;
            }

            // Insert event
            const evtRes = await client.query(`
                INSERT INTO campus_events 
                    (vendor_email, organization_name, title, description, venue, university, start_time, category, poster_url, status, is_featured)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
                RETURNING id;
            `, [ev.vendor_email, ev.organization_name, ev.title, ev.description, ev.venue, ev.university, ev.start_time, ev.category, ev.poster_url, ev.status]);

            const eventId = evtRes.rows[0].id;

            // Insert ticket tiers
            for (const tier of ev.tiers) {
                await client.query(`
                    INSERT INTO campus_ticket_types (event_id, tier_name, price_ghs, capacity)
                    VALUES ($1, $2, $3, $4);
                `, [eventId, tier.name, tier.price, tier.capacity]);
            }

            inserted++;
        }

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                success: true,
                message: `Seeded ${inserted} events. Skipped ${skipped} (already exist).`,
                inserted,
                skipped
            })
        };

    } catch (err) {
        console.error('Seed Error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    } finally {
        if (client) client.release();
    }
};
