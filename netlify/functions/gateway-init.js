const { Pool } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Merchant-Key',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

function generateGatewayRef() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'GW-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed. Use POST.' }) };
    }

    let client;
    try {
        const body = JSON.parse(event.body || '{}');
        const {
            amount,
            email,
            customer_name,
            title,
            merchant_name,
            merchant_ref,
            callback_url,
            cancel_url,
            metadata
        } = body;

        // Validation
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid payment amount in GHS is required.' }) };
        }
        if (!email || !email.includes('@')) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid customer email address is required.' }) };
        }
        if (!callback_url || !callback_url.startsWith('http')) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid callback_url (http/https) is required so we can return the customer to your website after payment.' }) };
        }

        const amountGHS = parseFloat(parseFloat(amount).toFixed(2));
        const amountInPesewas = Math.round(amountGHS * 100);
        const gatewayRef = generateGatewayRef();
        const cleanEmail = email.trim().toLowerCase();
        const merchantName = (merchant_name || 'Partner Store').trim();
        const paymentTitle = (title || `Payment to ${merchantName}`).trim();
        const merchantRef = (merchant_ref || ('ORD-' + Date.now())).trim();

        // 1. Initialize Paystack Checkout
        const gatewayReturnUrl = `https://campuseventghana.site/gateway.html?session=${gatewayRef}`;

        const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: cleanEmail,
                amount: amountInPesewas,
                currency: 'GHS',
                reference: gatewayRef,
                callback_url: gatewayReturnUrl,
                metadata: {
                    gateway_ref: gatewayRef,
                    merchant_ref: merchantRef,
                    merchant_name: merchantName,
                    customer_name: customer_name || cleanEmail,
                    title: paymentTitle,
                    callback_url: callback_url,
                    custom_metadata: metadata || {}
                }
            })
        });

        const paystackData = await paystackRes.json();
        if (!paystackRes.ok || !paystackData.status || !paystackData.data?.authorization_url) {
            throw new Error(paystackData.message || 'Payment processor failed to initialize session.');
        }

        const paystackAuthUrl = paystackData.data.authorization_url;

        // 2. Record Session in Database
        client = await pool.connect();
        await client.query(`
            INSERT INTO campus_gateway_transactions (
                gateway_ref, merchant_ref, merchant_name, title, customer_email, customer_name,
                amount_ghs, callback_url, cancel_url, paystack_ref, paystack_auth_url, status, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', $12)
        `, [
            gatewayRef,
            merchantRef,
            merchantName,
            paymentTitle,
            cleanEmail,
            (customer_name || '').trim(),
            amountGHS,
            callback_url,
            cancel_url || null,
            gatewayRef,
            paystackAuthUrl,
            JSON.stringify(metadata || {})
        ]);

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                success: true,
                message: 'Payment session initialized successfully.',
                gateway_ref: gatewayRef,
                checkout_url: gatewayReturnUrl,
                paystack_url: paystackAuthUrl,
                amount_ghs: amountGHS,
                currency: 'GHS',
                merchant_ref: merchantRef
            })
        };

    } catch (err) {
        console.error('Gateway Init Error:', err);
        return {
            statusCode: 500,
            headers: CORS,
            body: JSON.stringify({ error: err.message || 'Gateway session initialization failed.' })
        };
    } finally {
        if (client) {
            try { client.release(); } catch(e) {}
        }
    }
};
