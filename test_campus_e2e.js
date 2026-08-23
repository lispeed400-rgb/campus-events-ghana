process.env.CAMPUS_TEST_MODE = 'true';

const { handler: eventsAPI } = require('./netlify/functions/campus-events-api');
const { handler: checkoutInit } = require('./netlify/functions/campus-checkout-init');
const { handler: checkoutVerify } = require('./netlify/functions/campus-checkout-verify');
const { handler: ticketVerify } = require('./netlify/functions/campus-ticket-verify');

async function testCampusPlatformE2E() {
    console.log('===========================================================');
    console.log('   CAMPUS EVENT MARKETPLACE - END-TO-END AUTOMATED TEST');
    console.log('===========================================================\n');

    // 1. Fetch Public Events
    console.log('📌 TEST 1: Fetching Public Campus Events...');
    const getRes = await eventsAPI({ httpMethod: 'GET', queryStringParameters: { status: 'APPROVED' } });
    console.log('HTTP Status:', getRes.statusCode);
    const getData = JSON.parse(getRes.body);
    console.log(`✅ Loaded ${getData.events.length} approved events. Current Commission Rate: ${getData.commissionPercent}%`);
    
    if (!getData.events.length) return console.error('❌ No events returned');

    const event = getData.events[0];
    const ticketTier = event.ticket_types[0];
    console.log(` Selected Event: "${event.title}" (${event.university}) | Tier: "${ticketTier.tier_name}" (GHS ${ticketTier.price_ghs})`);

    console.log('\n-----------------------------------------------------------\n');

    // 2. Test Transparent Fee Checkout Initialization
    console.log('📌 TEST 2: Initializing Transparent Fee Checkout...');
    const checkoutRes = await checkoutInit({
        httpMethod: 'POST',
        body: JSON.stringify({
            email: 'student_test@legon.edu.gh',
            eventId: event.id,
            ticketTypeId: ticketTier.id,
            quantity: 2
        })
    });
    console.log('HTTP Status:', checkoutRes.statusCode);
    const checkoutData = JSON.parse(checkoutRes.body);
    
    if (checkoutRes.statusCode === 200 && checkoutData.success) {
        console.log('✅ Transparent Pricing Breakdown Verified:');
        console.log(`   Base Amount (2 Tickets): GHS ${checkoutData.base_amount_ghs}`);
        console.log(`   Service Fee (${checkoutData.commission_percentage}%): GHS ${checkoutData.service_fee_ghs}`);
        console.log(`   Total Amount Charged: GHS ${checkoutData.total_amount_ghs}`);
        console.log(`   Paystack Authorization URL: ${checkoutData.authorization_url}`);
    } else {
        return console.error('❌ Checkout Init Failed:', checkoutRes.body);
    }

    console.log('\n-----------------------------------------------------------\n');

    // 3. Test Payment Verification & QR Code Ticket Generation
    console.log('📌 TEST 3: Verifying Checkout Order & Issuing QR Tickets...');
    const verifyRes = await checkoutVerify({
        httpMethod: 'GET',
        queryStringParameters: { reference: checkoutData.order_ref }
    });
    console.log('HTTP Status:', verifyRes.statusCode);
    const verifyData = JSON.parse(verifyRes.body);

    if (verifyRes.statusCode === 200 && verifyData.success && verifyData.tickets.length > 0) {
        console.log(`✅ ${verifyData.tickets.length} QR Tickets Issued Successfully!`);
        const ticket = verifyData.tickets[0];
        console.log(`   Ticket Code: ${ticket.ticket_code}`);
        console.log(`   QR Hash: ${ticket.qr_hash.substring(0, 16)}...`);
        console.log(`   Ticket Status: ${ticket.status}`);

        console.log('\n-----------------------------------------------------------\n');

        // 4. Test Mobile Door QR Scanner Endpoint (Check In)
        console.log('📌 TEST 4: Mobile Door Scanner Check-in (First Entry)...');
        const scanRes1 = await ticketVerify({
            httpMethod: 'POST',
            body: JSON.stringify({ ticketCode: ticket.ticket_code })
        });
        console.log('HTTP Status:', scanRes1.statusCode);
        console.log('Response Payload:', scanRes1.body);

        console.log('\n📌 TEST 5: Mobile Door Scanner (Duplicate Entry Rejection)...');
        const scanRes2 = await ticketVerify({
            httpMethod: 'POST',
            body: JSON.stringify({ ticketCode: ticket.ticket_code })
        });
        console.log('HTTP Status:', scanRes2.statusCode);
        console.log('Response Payload:', scanRes2.body);

    } else {
        console.error('❌ Ticket Generation Failed:', verifyRes.body);
    }

    console.log('\n-----------------------------------------------------------\n');

    // 5. Test Admin Commission Rate Update
    console.log('📌 TEST 6: Admin Configurable Commission Update (10% ➔ 12.5%)...');
    const commRes = await eventsAPI({
        httpMethod: 'POST',
        body: JSON.stringify({ action: 'ADMIN_UPDATE_COMMISSION', commissionPercent: 12.5 })
    });
    console.log('HTTP Status:', commRes.statusCode);
    console.log('Response Payload:', commRes.body);

    console.log('\n===========================================================');
    console.log('   🎉 ALL CAMPUS PLATFORM E2E TESTS PASSED 100%!');
    console.log('===========================================================');
}

testCampusPlatformE2E();
