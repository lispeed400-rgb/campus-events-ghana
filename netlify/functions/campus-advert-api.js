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

function generateAdvertRef() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'ADV-';
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

        // 1. GET - Fetch advert requests (optional admin / organizer lookup)
        if (event.httpMethod === 'GET') {
            const email = event.queryStringParameters?.email;
            let queryStr = 'SELECT * FROM campus_advert_requests';
            const params = [];

            if (email) {
                params.push(email.toLowerCase().trim());
                queryStr += ' WHERE LOWER(organizer_email) = $1';
            }

            queryStr += ' ORDER BY id DESC LIMIT 50';
            const res = await client.query(queryStr, params);

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ success: true, adverts: res.rows })
            };
        }

        // 2. POST - Submit new advert request
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const {
                organizerName,
                organizationName,
                organizerEmail,
                organizerPhone,
                university,
                eventTitle,
                eventCategory,
                expectedAttendance,
                eventDate,
                venue,
                advertPackage,
                posterUrl,
                description
            } = body;

            if (!organizerName || !organizerEmail || !organizerPhone || !university || !eventTitle) {
                return {
                    statusCode: 400,
                    headers: CORS,
                    body: JSON.stringify({ error: 'Please provide all required fields (Organizer Name, Email, Phone, Campus, Event Title).' })
                };
            }

            const refCode = generateAdvertRef();
            const attendance = parseInt(expectedAttendance || 100, 10);
            const chosenPackage = advertPackage || 'Standard Banner Promotion';

            await client.query(`
                INSERT INTO campus_advert_requests (
                    ref_code, organizer_name, organization_name, organizer_email, organizer_phone,
                    university, event_title, event_category, expected_attendance, event_date,
                    venue, advert_package, poster_url, description, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'PENDING');
            `, [
                refCode,
                organizerName.trim(),
                (organizationName || '').trim(),
                organizerEmail.toLowerCase().trim(),
                organizerPhone.trim(),
                university.trim(),
                eventTitle.trim(),
                eventCategory || 'CONCERT',
                attendance,
                eventDate ? new Date(eventDate).toISOString() : null,
                (venue || '').trim(),
                chosenPackage,
                (posterUrl || '').trim(),
                (description || '').trim()
            ]);

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    refCode,
                    message: '🎉 Your Ticket Advert Request has been submitted successfully! Our campus marketing team will contact you on WhatsApp/Email within 2 hours to confirm your campaign.',
                    advertDetails: {
                        refCode,
                        eventTitle,
                        university,
                        advertPackage: chosenPackage,
                        organizerEmail,
                        organizerPhone
                    }
                })
            };
        }

        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid request method.' }) };

    } catch (err) {
        console.error('Advert API Error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    } finally {
        if (client) client.release();
    }
};
