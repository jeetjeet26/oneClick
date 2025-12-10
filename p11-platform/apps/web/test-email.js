/**
 * Test Resend Email Configuration
 * Run this script to verify your Resend API key and email sending
 * 
 * Usage: node test-email.js
 */

require('dotenv').config({ path: '.env.local' })
const { Resend } = require('resend')

async function testResendEmail() {
  console.log('🔍 Testing Resend Email Configuration...\n')
  
  // Check environment variables
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  
  console.log('Configuration:')
  console.log(`  API Key: ${apiKey ? `${apiKey.substring(0, 10)}...` : '❌ MISSING'}`)
  console.log(`  From Email: ${fromEmail}\n`)
  
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is not set in .env.local')
    process.exit(1)
  }
  
  // Initialize Resend client
  const resend = new Resend(apiKey)
  
  try {
    console.log('📧 Attempting to send test email...\n')
    
    // Use jesse@p11.com since Resend test mode only allows sending to account owner
    const testEmail = 'jesse@p11.com'
    console.log(`📮 Sending to: ${testEmail}`)
    console.log('   (Resend test mode only allows sending to account owner)\n')
    
    const result = await resend.emails.send({
      from: fromEmail,
      to: testEmail,
      subject: 'Test Email from P11 Platform',
      text: 'This is a test email to verify Resend configuration. If you received this, email sending is working correctly!',
      html: '<p>This is a test email to verify Resend configuration.</p><p><strong>If you received this, email sending is working correctly!</strong></p>',
    })
    
    console.log('📨 Full Resend API Response:')
    console.log(JSON.stringify(result, null, 2))
    console.log()
    
    if (result.error) {
      console.error('❌ Resend API returned an error:')
      console.error(JSON.stringify(result.error, null, 2))
      console.log('\nPossible issues:')
      console.log('  - Invalid API key')
      console.log('  - API key expired or revoked')
      console.log('  - From email domain not verified')
      console.log('  - Rate limit exceeded')
      process.exit(1)
    }
    
    if (result.data && result.data.id) {
      console.log('✅ Email sent successfully!')
      console.log(`   Message ID: ${result.data.id}`)
      console.log('\n📋 Next steps:')
      console.log('  1. Check your inbox (jesse@p11.com)')
      console.log('  2. Check spam folder if not in inbox')
      console.log('  3. View email details at: https://resend.com/emails')
      console.log('\n✨ Your Resend configuration is working correctly!')
      console.log('\n⚠️  NOTE: To send to other email addresses, verify your domain:')
      console.log('   https://resend.com/domains')
    } else {
      console.warn('⚠️  Email may have been sent, but response is unexpected:')
      console.log(JSON.stringify(result, null, 2))
      console.log('\nThe email might still be delivered. Check:')
      console.log('  - Your inbox (jesse@p11.com)')
      console.log('  - Resend dashboard: https://resend.com/emails')
    }
    
  } catch (error) {
    console.error('❌ Exception occurred while sending email:')
    console.error(error)
    
    if (error.message) {
      console.error(`\nError message: ${error.message}`)
    }
    
    if (error.statusCode) {
      console.error(`Status code: ${error.statusCode}`)
    }
    
    console.log('\n💡 Troubleshooting tips:')
    console.log('  - Verify your API key at: https://resend.com/api-keys')
    console.log('  - Check if your API key has been revoked')
    console.log('  - Ensure you have not exceeded rate limits')
    console.log('  - Try generating a new API key')
    
    process.exit(1)
  }
}

// Run the test
testResendEmail()

