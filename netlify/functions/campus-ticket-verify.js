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

        // 1. GET — Fetch user's tickets by email
        if (event.httpMethod === 'GET') {
            const email = event.queryStringParameters?.email;
            if (!email) {
                return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing email query parameter' }) };
            }

            const ticketsRes = await client.query(`
                SELECT t.*, e.title as event_title, e.venue, e.university, e.start_time, e.poster_url, e.category,
                       tt.tier_name, tt.price_ghs,
                       o.buyer_name as attendee_name, o.buyer_email as attendee_email
                FROM campus_tickets t
                JOIN campus_events e ON t.event_id = e.id
                JOIN campus_ticket_types tt ON t.ticket_type_id = tt.id
                JOIN campus_orders o ON t.order_id = o.id
                WHERE LOWER(t.attendee_email) = $1
                ORDER BY t.id DESC
            `, [email.toLowerCase().trim()]);

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    tickets: ticketsRes.rows
                })
            };
        }

        // 2. POST — Door Scanner Ticket Check-in Endpoint
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { ticketCode, qrHash, vendorEmail } = body;

            const codeQuery = ticketCode ? ticketCode.trim().toUpperCase() : null;
            const hashQuery = qrHash ? qrHash.trim() : null;

            if (!codeQuery && !hashQuery) {
                return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing ticketCode or qrHash for scanner check-in' }) };
            }

            // Lookup ticket
            const tktRes = await client.query(`
                SELECT t.*, e.title as event_title, e.venue, e.university, e.start_time, e.vendor_email, tt.tier_name, tt.price_ghs
                FROM campus_tickets t
                JOIN campus_events e ON t.event_id = e.id
                JOIN campus_ticket_types tt ON t.ticket_type_id = tt.id
                WHERE t.ticket_code = $1 OR t.qr_hash = $2
            `, [codeQuery, hashQuery]);

            if (tktRes.rows.length === 0) {
                return {
                    statusCode: 404,
                    headers: CORS,
                    body: JSON.stringify({ success: false, status: 'INVALID', error: 'Ticket code not found in system database!' })
                };
            }

            const ticket = tktRes.rows[0];

            // Check if ticket already used
            if (ticket.status === 'USED') {
                return {
                    statusCode: 409,
                    headers: CORS,
                    body: JSON.stringify({
                        success: false,
                        status: 'ALREADY_USED',
                        error: `TICKET ALREADY USED! Scanned at: ${new Date(ticket.checked_in_at).toLocaleTimeString()}`,
                        ticket: ticket
                    })
                };
            }

            if (ticket.status === 'CANCELLED') {
                return {
                    statusCode: 400,
                    headers: CORS,
                    body: JSON.stringify({ success: false, status: 'CANCELLED', error: 'This ticket has been cancelled or refunded.' })
                };
            }

            // Mark ticket as USED and record check-in timestamp
            await client.query(`
                UPDATE campus_tickets 
                SET status = 'USED', checked_in_at = CURRENT_TIMESTAMP 
                WHERE id = $1
            `, [ticket.id]);

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    status: 'CHECKED_IN',
                    message: `✅ ADMIT ATTENDEE! Valid ${ticket.tier_name} Ticket for ${ticket.event_title}.`,
                    ticket: { ...ticket, status: 'USED', checked_in_at: new Date() }
                })
            };
        }

    } catch (err) {
        console.error('Ticket Scanner Error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    } finally {
        if (client) client.release();
    }
};
