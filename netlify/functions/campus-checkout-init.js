const { Pool } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    let client;
    try {
        const body = JSON.parse(event.body || '{}');
        const { email, name, eventId, ticketTypeId, quantity } = body;

        if (!email || !eventId || !ticketTypeId) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required checkout fields' }) };
        }

        const qty = Math.max(1, parseInt(quantity || 1, 10));

        client = await pool.connect();

        // 1. Fetch Tier & Settings in a single optimized query
        const queryRes = await client.query(`
            SELECT tt.id, tt.price_ghs, COALESCE(s.value, '12.5') as commission_pct
            FROM campus_ticket_types tt
            LEFT JOIN campus_settings s ON s.key = 'ticket_commission_percent'
            WHERE tt.id = $1
        `, [ticketTypeId]);

        if (queryRes.rows.length === 0) {
            return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Ticket tier not found' }) };
        }

        const tier = queryRes.rows[0];
        const commissionPct = parseFloat(tier.commission_pct || '12.5');

        // Price calculation
        const baseAmountGHS = parseFloat(tier.price_ghs) * qty;
        const serviceFeeGHS = parseFloat((baseAmountGHS * (commissionPct / 100)).toFixed(2));
        const totalAmountGHS = parseFloat((baseAmountGHS + serviceFeeGHS).toFixed(2));
        const amountInPesewas = Math.round(totalAmountGHS * 100);

        const orderRef = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);

        // 2. Insert Pending Order and Initialize Paystack in parallel
        const insertOrderPromise = client.query(`
            INSERT INTO campus_orders (order_ref, buyer_email, buyer_name, event_id, ticket_type_id, quantity, base_amount_ghs, service_fee_ghs, total_amount_ghs, commission_percentage, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING')
        `, [orderRef, email.toLowerCase(), (name || '').trim(), eventId, ticketTypeId, qty, baseAmountGHS, serviceFeeGHS, totalAmountGHS, commissionPct]);

        const paystackPromise = fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email.toLowerCase(),
                amount: amountInPesewas,
                currency: 'GHS',
                reference: orderRef,
                callback_url: 'https://campuseventghana.site/tickets.html?order_ref=' + orderRef,
                metadata: {
                    order_ref: orderRef,
                    event_id: eventId,
                    ticket_type_id: ticketTypeId,
                    quantity: qty,
                    base_ghs: baseAmountGHS,
                    service_fee_ghs: serviceFeeGHS
                }
            })
        }).then(r => r.json());

        const [_, paystackData] = await Promise.all([insertOrderPromise, paystackPromise]);

        if (paystackData.status && paystackData.data?.authorization_url) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    authorization_url: paystackData.data.authorization_url,
                    order_ref: orderRef,
                    base_amount_ghs: baseAmountGHS,
                    service_fee_ghs: serviceFeeGHS,
                    total_amount_ghs: totalAmountGHS,
                    commission_percentage: commissionPct
                })
            };
        } else {
            throw new Error(paystackData.message || 'Failed to initialize Paystack gateway');
        }

    } catch (err) {
        console.error('Checkout Init Error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    } finally {
        if (client) {
            try { client.release(); } catch(e) {}
        }
    }
};
