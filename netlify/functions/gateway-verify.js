const { Pool } = require('pg');

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

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    let client;
    try {
        const params = event.queryStringParameters || {};
        const ref = params.reference || params.session || params.gateway_ref || params.trxref;

        if (!ref) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing reference or session query parameter.' }) };
        }

        client = await pool.connect();

        // 1. Find transaction in database
        const txRes = await client.query(`
            SELECT * FROM campus_gateway_transactions 
            WHERE gateway_ref = $1 OR paystack_ref = $1 OR merchant_ref = $1
            LIMIT 1
        `, [ref]);

        if (txRes.rows.length === 0) {
            return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Transaction session not found in gateway.' }) };
        }

        let tx = txRes.rows[0];

        // 2. If already marked SUCCESS, return immediate verified status
        if (tx.status === 'SUCCESS') {
            const redirectUrl = buildRedirectUrl(tx.callback_url, tx, 'success');
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    status: 'SUCCESS',
                    verified: true,
                    transaction: {
                        gateway_ref: tx.gateway_ref,
                        merchant_ref: tx.merchant_ref,
                        merchant_name: tx.merchant_name,
                        title: tx.title,
                        customer_email: tx.customer_email,
                        customer_name: tx.customer_name,
                        amount_ghs: parseFloat(tx.amount_ghs),
                        currency: 'GHS',
                        status: 'SUCCESS',
                        created_at: tx.created_at,
                        paid_at: tx.updated_at
                    },
                    redirect_url: redirectUrl,
                    callback_url: tx.callback_url
                })
            };
        }

        // 3. Verify status directly with Paystack
        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${tx.gateway_ref}`, {
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET}` }
        });
        const verifyData = await verifyRes.json();

        if (verifyRes.ok && verifyData.status && verifyData.data?.status === 'success') {
            // Mark transaction as SUCCESS in DB
            await client.query(`
                UPDATE campus_gateway_transactions 
                SET status = 'SUCCESS', updated_at = NOW() 
                WHERE id = $1
            `, [tx.id]);

            tx.status = 'SUCCESS';
            const redirectUrl = buildRedirectUrl(tx.callback_url, tx, 'success');

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    status: 'SUCCESS',
                    verified: true,
                    message: 'Payment verified and marked as SUCCESS.',
                    transaction: {
                        gateway_ref: tx.gateway_ref,
                        merchant_ref: tx.merchant_ref,
                        merchant_name: tx.merchant_name,
                        title: tx.title,
                        customer_email: tx.customer_email,
                        customer_name: tx.customer_name,
                        amount_ghs: parseFloat(tx.amount_ghs),
                        currency: 'GHS',
                        status: 'SUCCESS',
                        created_at: tx.created_at,
                        paid_at: new Date().toISOString()
                    },
                    redirect_url: redirectUrl,
                    callback_url: tx.callback_url
                })
            };
        } else {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: false,
                    status: 'PENDING',
                    verified: false,
                    message: 'Payment is pending or unconfirmed by payment provider.',
                    transaction: {
                        gateway_ref: tx.gateway_ref,
                        merchant_ref: tx.merchant_ref,
                        amount_ghs: parseFloat(tx.amount_ghs),
                        status: tx.status
                    },
                    paystack_url: tx.paystack_auth_url,
                    callback_url: tx.callback_url
                })
            };
        }

    } catch (err) {
        console.error('Gateway Verify Error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message || 'Verification failed.' }) };
    } finally {
        if (client) {
            try { client.release(); } catch(e) {}
        }
    }
};

function buildRedirectUrl(baseCallbackUrl, tx, status) {
    try {
        const url = new URL(baseCallbackUrl);
        url.searchParams.set('status', status);
        url.searchParams.set('transaction_id', tx.gateway_ref);
        url.searchParams.set('merchant_ref', tx.merchant_ref || '');
        url.searchParams.set('amount', parseFloat(tx.amount_ghs).toFixed(2));
        url.searchParams.set('currency', 'GHS');
        url.searchParams.set('customer_email', tx.customer_email || '');
        return url.toString();
    } catch (e) {
        const joinChar = baseCallbackUrl.includes('?') ? '&' : '?';
        return `${baseCallbackUrl}${joinChar}status=${status}&transaction_id=${tx.gateway_ref}&merchant_ref=${encodeURIComponent(tx.merchant_ref || '')}&amount=${tx.amount_ghs}&currency=GHS`;
    }
}
