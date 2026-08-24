const { Client } = require('pg');

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

const UNIVERSITIES = [
    { name: 'UG Legon', venues: ['Great Hall', 'Legon Sports Stadium', 'Central Cafeteria Quad', 'Balme Library Forecourt', 'Athletic Oval', 'Commonwealth Hall Grounds', 'Volta Hall Forecourt'] },
    { name: 'KNUST', venues: ['KNUST Great Hall', 'Independence Hall Grounds', 'Queens Hall Square', 'Repu Quadrangle', 'KNUST Royal Golf Park', 'Brunei Complex', 'Commercial Area Stage'] },
    { name: 'UCC', venues: ['UCC New Examination Centre', 'Valco Hall Courtyard', 'Casely Hayford Forecourt', 'UCC Sports Complex', 'Sasakawa Centre', 'FELT Auditorium'] },
    { name: 'UPSA', venues: ['UPSA Main Auditorium', 'Astro Turf Arena', 'East Legon Quad', 'Faculty of Management Hall', 'Hostel C Grounds', 'Ohene Konadu Auditorium'] },
    { name: 'Ashesi', venues: ['Ashesi Performance Space', 'The Hive Amphitheatre', 'Courtyard 1', 'Berekuso Hilltop Lounge', 'Norton-Motulsky Hall', 'Archer Cornfield Courtyard'] },
    { name: 'GIMPA', venues: ['GIMPA Executive Conference Hall', 'Greenhill Amphitheatre', 'GBMS Forecourt', 'Law Faculty Auditorium'] },
    { name: 'Academic City', venues: ['Agility Hub Arena', 'Engineering Courtyard', 'Main Innovation Center', 'Presidential Lawn'] },
    { name: 'Central University', venues: ['Miotso Sports Pavilion', 'Trinity Hall Quad', 'Christ Temple Ground', 'ICGC Central Dome'] }
];

const EVENT_TEMPLATES = [
    // Concerts
    { title: 'Wildout Campus Afro-Festival', category: 'CONCERT', org: 'WildOut Events Gh', desc: 'The biggest outdoor campus festival featuring top African artists, live bands, and neon laser shows.' },
    { title: 'Detty December Warm-Up Live', category: 'CONCERT', org: 'EchoHouse Africa', desc: 'Kicking off the December rave season with non-stop Afrobeats, Amapiano, and guest headliners.' },
    { title: 'Repu Hall Artiste Night', category: 'CONCERT', org: 'Hall Week Committee', desc: 'Legendary hall week headline concert with the hottest DJs, dance battles, and headline music acts.' },
    { title: 'Vandals Electric Concert', category: 'CONCERT', org: 'Commonwealth Entertainment', desc: 'High-energy live music showcase with top hitmakers, special guest appearances, and fireworks.' },
    { title: 'Amapiano & Sunsets Live Show', category: 'CONCERT', org: 'Groove Nation Gh', desc: 'South African & Ghanaian Amapiano fusion live with international guest DJs and sunset vibes.' },
    { title: 'Highlife & Afrobeats Fusion Night', category: 'CONCERT', org: 'Ghana Arts Collective', desc: 'A rich celebration of live highlife melodies and contemporary Afrobeats with full orchestra.' },
    { title: 'Campus Praise & Worship Festival', category: 'CONCERT', org: 'Campus Christian Fellowship', desc: 'An extraordinary night of gospel music, live choir orchestrations, and soul-lifting worship.' },
    { title: 'HipHop & Drill Campus Knockout', category: 'CONCERT', org: 'Asakaa Movement Hub', desc: 'Kumerica drill, rap battles, freestyle showdowns and heavyweight hip-hop performances.' },
    { title: 'Black & Gold Homecoming Concert', category: 'CONCERT', org: 'Alumni & SRC Board', desc: 'Annual homecoming mega concert reuniting students and alumni with iconic throwback and modern acts.' },
    { title: 'Midnight Starlight Acoustic Session', category: 'CONCERT', org: 'Unplugged Sessions Gh', desc: 'Intimate acoustic music, soul, R&B, and poetry under the starlit sky with candlelit seating.' },

    // Parties
    { title: 'All Black Neon Rave 2026', category: 'PARTY', org: 'Blackout Party Crew', desc: 'Dress in black with glowing neon paint. 5 DJs, 360-degree stage, foam cannons, and LED light show.' },
    { title: 'Silent Disco Campus Experience', category: 'PARTY', org: 'Silent Beats Ghana', desc: '3 Channels: Red (Afrobeats), Blue (HipHop), Green (Amapiano). Pick your channel and party till dawn.' },
    { title: 'Halloween Haunted Hall Masquerade', category: 'PARTY', org: 'Night Owls Syndicate', desc: 'Ghana\'s wildest university costume rave with mystery prizes, haunted maze, and spooky cocktail bars.' },
    { title: 'Sunset Foam & Pool Extravaganza', category: 'PARTY', org: 'Splash Campus Events', desc: 'Day-to-night foam party, water gun battles, pool volleyball, poolside grill, and summer anthems.' },
    { title: 'Retro 90s & 2000s Throwback Jam', category: 'PARTY', org: 'Vintage Vibes Gh', desc: 'Relive the golden era of Hiplife, R&B, and old-school classics with vintage dress codes and games.' },
    { title: 'All-White Moonlit Gala Party', category: 'PARTY', org: 'Elite Campus Socials', desc: 'Sophisticated all-white party featuring luxury cocktail stations, red carpet photo booths, and VIP cabanas.' },
    { title: 'End-of-Semester Shutdown Rave', category: 'PARTY', org: 'The Vibe Cartel', desc: 'Celebrate the completion of exams with a high-octane 10-hour rave across two outdoor dancefloors.' },
    { title: 'Carnival Street Bash & Cookout', category: 'PARTY', org: 'Campus Foodies & Beats', desc: 'Jollof battles, barbecue grills, street food vendors, carnival dancers, and outdoor party music.' },
    { title: 'Afro-Futurism Cosmic Rave', category: 'PARTY', org: 'HyperVibe Lab', desc: 'Cyberpunk meets African culture. Ultra-violet lighting, glow sticks, holographic visuals, and bass-heavy EDM.' },
    { title: 'Rep Your Hall Jersey Fiesta', category: 'PARTY', org: 'SRC Sports & Socials', desc: 'Wear your favorite club or hall jersey for the ultimate football, FIFA gaming, and night dance party.' },

    // Seminars & Tech
    { title: 'Ghana Student AI & Tech Summit', category: 'SEMINAR', org: 'Tech Innovators Hub', desc: 'Hands-on workshops on Generative AI, machine learning, cloud architectures, and tech careers in Africa.' },
    { title: 'Fintech & Mobile Money Masterclass', category: 'SEMINAR', org: 'African Fintech League', desc: 'Discover how mobile money, blockchain, and payment APIs are reshaping commerce across West Africa.' },
    { title: 'Campus Startup Pitch & VC Showcase', category: 'SEMINAR', org: 'Student Enterprise Incubator', desc: 'Student founders pitch for up to GHS 50,000 in non-dilutive grant funding before angel investors.' },
    { title: 'Product Design & UX BootCamp', category: 'SEMINAR', org: 'Designers Guild Gh', desc: 'Intensive UI/UX design session covering Figma, UX research, prototyping, and portfolio building.' },
    { title: 'Youth Leadership & Policy Forum', category: 'SEMINAR', org: 'Future Leaders Network', desc: 'Keynote panels with national policymakers, business executives, and student leaders on national growth.' },
    { title: 'Web3 & Decentralized Future Conference', category: 'SEMINAR', org: 'Blockchain Campus Gh', desc: 'Smart contracts, crypto economics, decentralized identity, and developer tooling in emerging markets.' },
    { title: 'Global Study Abroad & Scholarship Expo', category: 'SEMINAR', org: 'International Education Desk', desc: 'Direct access to reps from universities in USA, UK, Canada, and Europe with full scholarship guides.' },
    { title: 'Digital Marketing & Content Creator Summit', category: 'SEMINAR', org: 'Creator Economy West Africa', desc: 'Learn monetization on YouTube, TikTok, brand partnerships, and algorithmic growth strategies.' },
    { title: 'Cybersecurity Defense & Ethical Hacking', category: 'SEMINAR', org: 'CyberSec Campus Ghana', desc: 'Live penetration testing demonstrations, bug bounty guides, and defensive security protocols.' },
    { title: 'Career Acceleration & LinkedIn Networking', category: 'SEMINAR', org: 'Corporate Mentorship Guild', desc: 'Resume reviews, mock interviews, LinkedIn profile optimization, and direct hiring manager meetups.' }
];

const POSTERS = {
    CONCERT: [
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
        'https://images.unsplash.com/photo-1501386761578-eaa54b292f73?w=800&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
        'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&q=80',
        'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80'
    ],
    PARTY: [
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
        'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=800&q=80',
        'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
        'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80',
        'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80'
    ],
    SEMINAR: [
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
        'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800&q=80',
        'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80',
        'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
        'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80',
        'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80'
    ]
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function escapeSql(str) {
    if (!str) return "''";
    return "'" + str.replace(/'/g, "''") + "'";
}

async function runSeed() {
    console.log('🚀 Starting Fast Batch 100 Campus Events Seeding...');
    const client = new Client({ connectionString: DB_CONN, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Ensure buyer_name column exists in campus_orders
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='campus_orders' AND column_name='buyer_name'
                ) THEN 
                    ALTER TABLE campus_orders ADD COLUMN buyer_name TEXT; 
                END IF;
            END $$;
        `);

        // Clean tables
        await client.query('TRUNCATE TABLE campus_tickets, campus_orders, campus_ticket_types, campus_events RESTART IDENTITY CASCADE;');
        console.log('🧹 Cleaned existing tables');

        // Prepare 100 events
        const eventRows = [];
        for (let i = 0; i < 100; i++) {
            const uniObj = UNIVERSITIES[i % UNIVERSITIES.length];
            const venue = uniObj.venues[i % uniObj.venues.length];
            const tmpl = EVENT_TEMPLATES[i % EVENT_TEMPLATES.length];

            // Dates Oct 1 to Dec 31
            const dayOffset = Math.floor((i / 100) * 91);
            const baseDate = new Date(Date.UTC(2026, 9, 1)); // Oct 1, 2026
            baseDate.setDate(baseDate.getDate() + dayOffset);
            const hours = [10, 14, 18, 19, 20, 21, 22][i % 7];
            baseDate.setHours(hours, [0, 30][i % 2], 0, 0);

            const posterList = POSTERS[tmpl.category] || POSTERS.CONCERT;
            const posterUrl = posterList[i % posterList.length];
            const eventTitle = `${tmpl.title} - ${uniObj.name} Edition ${i >= 30 ? `Vol. ${Math.floor(i/10)}` : ''}`;
            const vendorEmail = `events@${uniObj.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu.gh`;
            const desc = `${tmpl.desc} Join fellow students from ${uniObj.name} and across Ghana for this flagship ${tmpl.category.toLowerCase()} experience.`;

            eventRows.push(`(
                ${escapeSql(vendorEmail)},
                ${escapeSql(tmpl.org)},
                ${escapeSql(eventTitle)},
                ${escapeSql(desc)},
                ${escapeSql(venue)},
                ${escapeSql(uniObj.name)},
                ${escapeSql(baseDate.toISOString())},
                ${escapeSql(tmpl.category)},
                ${escapeSql(posterUrl)},
                'APPROVED',
                ${i % 4 === 0 ? 'TRUE' : 'FALSE'}
            )`);
        }

        console.log('⚡ Inserting 100 events in batch...');
        const insertEventsSql = `
            INSERT INTO campus_events (
                vendor_email, organization_name, title, description, venue, university, start_time, category, poster_url, status, is_featured
            ) VALUES ${eventRows.join(',\n')}
            RETURNING id, category;
        `;

        const eventsRes = await client.query(insertEventsSql);
        console.log(`✅ Inserted ${eventsRes.rows.length} events!`);

        // Now prepare ticket types batch
        const tierRows = [];
        for (let i = 0; i < eventsRes.rows.length; i++) {
            const ev = eventsRes.rows[i];
            const eventId = ev.id;
            const cat = ev.category;

            // Tier 1: Minimum 50 GHS Regular Pass
            tierRows.push(`(${eventId}, 'Regular Entry Pass', 50.00, ${getRandomInt(200, 500)}, ${getRandomInt(5, 30)})`);

            if (cat === 'CONCERT' || cat === 'PARTY') {
                tierRows.push(`(${eventId}, 'VIP Front Row & Fast Pass', 400.00, ${getRandomInt(50, 100)}, ${getRandomInt(2, 10)})`);
                tierRows.push(`(${eventId}, 'VVIP Backstage & Artist Meet', 700.00, ${getRandomInt(20, 40)}, ${getRandomInt(1, 5)})`);
                tierRows.push(`(${eventId}, 'Platinum Table for 4 + Bottle', 1100.00, ${getRandomInt(10, 20)}, ${getRandomInt(0, 3)})`);
            } else if (cat === 'SEMINAR') {
                tierRows.push(`(${eventId}, 'Student Early Bird Delegate', 50.00, ${getRandomInt(100, 200)}, ${getRandomInt(8, 25)})`);
                tierRows.push(`(${eventId}, 'Executive VIP & Lunch Pass', 400.00, ${getRandomInt(30, 60)}, ${getRandomInt(1, 6)})`);
                tierRows.push(`(${eventId}, 'Corporate Sponsor Table Experience', 700.00, ${getRandomInt(15, 30)}, ${getRandomInt(0, 4)})`);
            } else {
                tierRows.push(`(${eventId}, 'VIP Access', 400.00, ${getRandomInt(40, 80)}, ${getRandomInt(2, 8)})`);
                tierRows.push(`(${eventId}, 'VIP Golden Circle Pass', 700.00, ${getRandomInt(20, 40)}, ${getRandomInt(1, 4)})`);
                tierRows.push(`(${eventId}, 'Exclusive Table Package', 1100.00, ${getRandomInt(10, 20)}, ${getRandomInt(0, 2)})`);
            }
        }

        console.log(`⚡ Inserting ${tierRows.length} ticket tiers in batch...`);
        const insertTiersSql = `
            INSERT INTO campus_ticket_types (event_id, tier_name, price_ghs, capacity, sold_count)
            VALUES ${tierRows.join(',\n')};
        `;

        await client.query(insertTiersSql);
        console.log(`✅ Inserted ${tierRows.length} ticket tiers!`);

        console.log('\n===============================================================');
        console.log('🎉 100 EVENTS WITH OCTOBER - DECEMBER DATES POPULATED!');
        console.log('💰 Ticket pricing range: 50 GHS minimum, 400 GHS, 700 GHS, 1,100 GHS VIP & Tables!');
        console.log('===============================================================');

    } catch (err) {
        console.error('❌ Seeding Error:', err);
    } finally {
        await client.end();
    }
}

runSeed();
