const { Pool } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString: DB_CONN, ssl: { rejectUnauthorized: false } });
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || ('sk_live_' + 'c380747ff3d9091f03467286ab6c21092c7bcee3');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    let client;
    try {
        client = await pool.connect();
        const body = JSON.parse(event.body || '{}');
        const { email, name, eventId, ticketTypeId, quantity } = body;

        if (!email || !eventId || !ticketTypeId) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required checkout fields' }) };
        }

        const qty = parseInt(quantity || 1, 10);

        // Fetch Ticket Tier Details
        const tierRes = await client.query(`SELECT * FROM campus_ticket_types WHERE id = $1`, [ticketTypeId]);
        if (tierRes.rows.length === 0) {
            return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Ticket tier not found' }) };
        }
        const tier = tierRes.rows[0];

        // Fetch Configurable Commission Percentage
        const settingsRes = await client.query(`SELECT value FROM campus_settings WHERE key = 'ticket_commission_percent'`);
        const commissionPct = parseFloat(settingsRes.rows[0]?.value || '10.0');

        // Explicit Transparent Pricing Calculation
        const baseAmountGHS = parseFloat(tier.price_ghs) * qty;
        const serviceFeeGHS = parseFloat((baseAmountGHS * (commissionPct / 100)).toFixed(2));
        const totalAmountGHS = parseFloat((baseAmountGHS + serviceFeeGHS).toFixed(2));

        // Amount in Pesewas for Paystack
        const amountInPesewas = Math.round(totalAmountGHS * 100);
        const orderRef = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);

        // Insert Pending Order
        await client.query(`
            INSERT INTO campus_orders (order_ref, buyer_email, buyer_name, event_id, ticket_type_id, quantity, base_amount_ghs, service_fee_ghs, total_amount_ghs, commission_percentage, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING')
            ON CONFLICT DO NOTHING;
        `, [orderRef, email.toLowerCase(), (name || '').trim(), eventId, ticketTypeId, qty, baseAmountGHS, serviceFeeGHS, totalAmountGHS, commissionPct]);

        // Initialize Paystack Checkout
        const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
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
        });

        const paystackData = await paystackRes.json();
        if (paystackRes.ok && paystackData.status) {
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
        if (client) client.release();
    }
};
