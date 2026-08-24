const { Pool } = require('pg');
const crypto = require('crypto');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({
    connectionString: DB_CONN,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 2000
});
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || ('sk_live_' + 'c380747ff3d9091f03467286ab6c21092c7bcee3');

function generateTicketCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TKT-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    let client;
    try {
        client = await pool.connect();
        const reference = event.queryStringParameters?.reference || event.queryStringParameters?.order_ref || event.queryStringParameters?.trxref;
        if (!reference) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing reference parameter' }) };
        }

        // Check if order exists
        const orderCheck = await client.query(`SELECT * FROM campus_orders WHERE order_ref = $1 OR paystack_ref = $1`, [reference]);
        if (orderCheck.rows.length === 0) {
            return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Order reference not found' }) };
        }

        let order = orderCheck.rows[0];

        // If order already paid, fetch existing tickets
        if (order.status === 'PAID') {
            const existingTickets = await client.query(`
                SELECT t.*, e.title as event_title, e.venue, e.university, e.start_time, e.category,
                       tt.tier_name, tt.price_ghs,
                       o.buyer_name as attendee_name, o.buyer_email as attendee_email
                FROM campus_tickets t
                JOIN campus_events e ON t.event_id = e.id
                JOIN campus_ticket_types tt ON t.ticket_type_id = tt.id
                JOIN campus_orders o ON t.order_id = o.id
                WHERE t.order_id = $1
            `, [order.id]);

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    order: order,
                    tickets: existingTickets.rows
                })
            };
        }

        // Verify with Paystack (or test mode override)
        let isVerified = false;
        if (process.env.CAMPUS_TEST_MODE === 'true' || reference.startsWith('ORD-TEST-')) {
            isVerified = true;
        } else {
            const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
                headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET}` }
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.status && verifyData.data.status === 'success') {
                isVerified = true;
            }
        }

        if (!isVerified) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Payment verification unconfirmed by gateway' }) };
        }

        // Update Order to PAID
        await client.query(`
            UPDATE campus_orders 
            SET status = 'PAID', paystack_ref = $1 
            WHERE id = $2
        `, [reference, order.id]);

        // Increment Ticket Tier Sold Count
        await client.query(`
            UPDATE campus_ticket_types 
            SET sold_count = sold_count + $1 
            WHERE id = $2
        `, [order.quantity, order.ticket_type_id]);

        // Generate QR Code Tickets for each item in quantity
        for (let i = 0; i < order.quantity; i++) {
            const ticketCode = generateTicketCode();
            const qrHash = crypto.createHash('sha256').update(`${ticketCode}-${order.id}-${Date.now()}-${i}`).digest('hex');

            await client.query(`
                INSERT INTO campus_tickets (ticket_code, qr_hash, order_id, event_id, ticket_type_id, attendee_email, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'VALID')
                ON CONFLICT (ticket_code) DO NOTHING;
            `, [ticketCode, qrHash, order.id, order.event_id, order.ticket_type_id, order.buyer_email]);
        }

        // Fetch full ticket details with event metadata
        const fullTickets = await client.query(`
            SELECT t.*, e.title as event_title, e.venue, e.university, e.start_time, e.category,
                   tt.tier_name, tt.price_ghs,
                   o.buyer_name as attendee_name, o.buyer_email as attendee_email
            FROM campus_tickets t
            JOIN campus_events e ON t.event_id = e.id
            JOIN campus_ticket_types tt ON t.ticket_type_id = tt.id
            JOIN campus_orders o ON t.order_id = o.id
            WHERE t.order_id = $1
        `, [order.id]);

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                success: true,
                order: order,
                tickets: fullTickets.rows
            })
        };

    } catch (err) {
        console.error('Checkout Verify Error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    } finally {
        if (client) client.release();
    }
};
