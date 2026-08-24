const { Pool } = require('pg');
const crypto = require('crypto');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString: DB_CONN, ssl: { rejectUnauthorized: false } });

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, originalHash] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    let client;
    try {
        client = await pool.connect();
        const body = JSON.parse(event.body || '{}');
        const { action } = body;

        // 1. REGISTER
        if (action === 'REGISTER') {
            const { email, password, full_name, university, phone } = body;

            if (!email || !password || !full_name || !university) {
                return {
                    statusCode: 400,
                    headers: CORS,
                    body: JSON.stringify({ error: 'Please provide full name, email, university, and password.' })
                };
            }

            const cleanEmail = email.toLowerCase().trim();
            if (password.length < 6) {
                return {
                    statusCode: 400,
                    headers: CORS,
                    body: JSON.stringify({ error: 'Password must be at least 6 characters long.' })
                };
            }

            // Check if user already exists
            const existing = await client.query('SELECT id FROM campus_users WHERE LOWER(email) = $1', [cleanEmail]);
            if (existing.rows.length > 0) {
                return {
                    statusCode: 409,
                    headers: CORS,
                    body: JSON.stringify({ error: 'An account with this email already exists. Please log in.' })
                };
            }

            const passwordHash = hashPassword(password);
            const userRes = await client.query(`
                INSERT INTO campus_users (email, password_hash, full_name, university, phone, role)
                VALUES ($1, $2, $3, $4, $5, 'STUDENT')
                RETURNING id, email, full_name, university, phone, role, created_at;
            `, [cleanEmail, passwordHash, full_name.trim(), university.trim(), (phone || '').trim()]);

            const user = userRes.rows[0];
            const token = crypto.randomBytes(32).toString('hex');

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    message: 'Account created successfully! Welcome to Campus Events Ghana.',
                    user,
                    token
                })
            };
        }

        // 2. LOGIN
        if (action === 'LOGIN') {
            const { email, password } = body;

            if (!email || !password) {
                return {
                    statusCode: 400,
                    headers: CORS,
                    body: JSON.stringify({ error: 'Please enter both your email address and password.' })
                };
            }

            const cleanEmail = email.toLowerCase().trim();
            const userRes = await client.query('SELECT * FROM campus_users WHERE LOWER(email) = $1', [cleanEmail]);

            if (userRes.rows.length === 0) {
                return {
                    statusCode: 401,
                    headers: CORS,
                    body: JSON.stringify({ error: 'No account found with this email. Please sign up.' })
                };
            }

            const user = userRes.rows[0];
            const isValid = verifyPassword(password, user.password_hash);

            if (!isValid) {
                return {
                    statusCode: 401,
                    headers: CORS,
                    body: JSON.stringify({ error: 'Incorrect password. Please try again.' })
                };
            }

            const token = crypto.randomBytes(32).toString('hex');
            const safeUser = {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                university: user.university,
                phone: user.phone,
                role: user.role,
                created_at: user.created_at
            };

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    message: `Welcome back, ${safeUser.full_name}!`,
                    user: safeUser,
                    token
                })
            };
        }

        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid auth action specified.' }) };

    } catch (err) {
        console.error('Campus Auth Error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    } finally {
        if (client) client.release();
    }
};
