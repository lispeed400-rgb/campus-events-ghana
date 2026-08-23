const { Pool } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString: DB_CONN, ssl: { rejectUnauthorized: false } });

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    let client;
    try {
        client = await pool.connect();

        // 1. GET — Public Event Discovery & Telemetry
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};
            const universityFilter = params.university;
            const categoryFilter = params.category;
            const statusFilter = params.status || 'APPROVED';
            const vendorEmail = params.vendor_email;
            const isAdmin = params.is_admin === 'true';

            // Query Events
            let queryStr = `
                SELECT e.*, 
                    COALESCE(json_agg(tt.*) FILTER (WHERE tt.id IS NOT NULL), '[]') as ticket_types
                FROM campus_events e
                LEFT JOIN campus_ticket_types tt ON e.id = tt.event_id
                WHERE 1=1
            `;
            const queryParams = [];

            if (!isAdmin && !vendorEmail) {
                queryStr += ` AND e.status = 'APPROVED'`;
            } else if (statusFilter && statusFilter !== 'ALL') {
                queryParams.push(statusFilter);
                queryStr += ` AND e.status = $${queryParams.length}`;
            }

            if (universityFilter && universityFilter !== 'ALL') {
                queryParams.push(universityFilter);
                queryStr += ` AND e.university = $${queryParams.length}`;
            }

            if (categoryFilter && categoryFilter !== 'ALL') {
                queryParams.push(categoryFilter);
                queryStr += ` AND e.category = $${queryParams.length}`;
            }

            if (vendorEmail) {
                queryParams.push(vendorEmail);
                queryStr += ` AND e.vendor_email = $${queryParams.length}`;
            }

            queryStr += ` GROUP BY e.id ORDER BY e.is_featured DESC, e.id DESC`;

            const eventsRes = await client.query(queryStr, queryParams);

            // Query Platform Settings (Commission Percentage)
            const settingsRes = await client.query(`SELECT value FROM campus_settings WHERE key = 'ticket_commission_percent'`);
            const commissionPercent = parseFloat(settingsRes.rows[0]?.value || '10.0');

            // Query Pending Vendors for Admin
            let pendingVendors = [];
            let allVendors = [];
            if (isAdmin) {
                const vendorsRes = await client.query(`SELECT * FROM campus_vendors ORDER BY id DESC`);
                allVendors = vendorsRes.rows;
                pendingVendors = vendorsRes.rows.filter(v => !v.is_verified);
            }

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    events: eventsRes.rows,
                    commissionPercent: commissionPercent,
                    vendors: allVendors,
                    pendingVendors: pendingVendors
                })
            };
        }

        // 2. POST — Submissions & Admin Actions
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { action } = body;

            // Action: SUBMIT_VENDOR_PROFILE
            if (action === 'SUBMIT_VENDOR_PROFILE') {
                const { userEmail, organizationName, university, contactPhone, bio } = body;
                if (!userEmail || !organizationName || !university || !contactPhone) {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required vendor fields' }) };
                }

                await client.query(`
                    INSERT INTO campus_vendors (user_email, organization_name, university, contact_phone, bio, is_verified)
                    VALUES ($1, $2, $3, $4, $5, FALSE)
                    ON CONFLICT (user_email) DO UPDATE 
                    SET organization_name = $2, university = $3, contact_phone = $4, bio = $5;
                `, [userEmail.toLowerCase(), organizationName, university, contactPhone, bio || '']);

                return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, message: 'Vendor profile submitted! Pending admin verification.' }) };
            }

            // Action: SUBMIT_EVENT
            if (action === 'SUBMIT_EVENT') {
                const { vendorEmail, organizationName, title, description, venue, university, startTime, category, posterUrl, ticketTiers } = body;
                if (!vendorEmail || !title || !venue || !university || !startTime || !category) {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required event fields' }) };
                }

                const evtRes = await client.query(`
                    INSERT INTO campus_events (vendor_email, organization_name, title, description, venue, university, start_time, category, poster_url, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
                    RETURNING id;
                `, [vendorEmail.toLowerCase(), organizationName || 'Campus Organizer', title, description || '', venue, university, startTime, category, posterUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800']);

                const eventId = evtRes.rows[0].id;

                // Add Ticket Tiers
                if (ticketTiers && Array.isArray(ticketTiers) && ticketTiers.length > 0) {
                    for (let tier of ticketTiers) {
                        await client.query(`
                            INSERT INTO campus_ticket_types (event_id, tier_name, price_ghs, capacity)
                            VALUES ($1, $2, $3, $4);
                        `, [eventId, tier.name || 'Regular', parseFloat(tier.price || 0), parseInt(tier.capacity || 100)]);
                    }
                } else {
                    // Default Regular Ticket Tier
                    await client.query(`
                        INSERT INTO campus_ticket_types (event_id, tier_name, price_ghs, capacity)
                        VALUES ($1, 'Regular', 30.00, 200);
                    `, [eventId]);
                }

                return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, message: 'Event submitted successfully! Pending admin approval.' }) };
            }

            // Action: ADMIN_APPROVE_EVENT
            if (action === 'ADMIN_APPROVE_EVENT') {
                const { eventId, status } = body; // 'APPROVED' or 'REJECTED'
                await client.query(`UPDATE campus_events SET status = $1 WHERE id = $2`, [status || 'APPROVED', eventId]);
                return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, message: `Event status updated to ${status}!` }) };
            }

            // Action: ADMIN_VERIFY_VENDOR
            if (action === 'ADMIN_VERIFY_VENDOR') {
                const { vendorEmail, isVerified } = body;
                await client.query(`UPDATE campus_vendors SET is_verified = $1 WHERE user_email = $2`, [isVerified !== false, vendorEmail.toLowerCase()]);
                return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, message: 'Vendor verification updated!' }) };
            }

            // Action: ADMIN_UPDATE_COMMISSION
            if (action === 'ADMIN_UPDATE_COMMISSION') {
                const { commissionPercent } = body;
                const pct = parseFloat(commissionPercent || 10.0).toFixed(1);
                await client.query(`
                    INSERT INTO campus_settings (key, value, updated_at)
                    VALUES ('ticket_commission_percent', $1, CURRENT_TIMESTAMP)
                    ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP;
                `, [pct]);
                return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, message: `Platform commission rate updated to ${pct}%!` }) };
            }

            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action' }) };
        }

    } catch (err) {
        console.error('Events API Error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    } finally {
        if (client) client.release();
    }
};
