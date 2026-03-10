/**
 * ===========================================
 * TESTMAIL.APP OTP HELPER — Continuum
 * ===========================================
 * Calls the Testmail.app API to wait for and extract
 * the one-time password from the test inbox.
 * ===========================================
 */

const https = require('https');

async function getOtp({ apiKey, namespace, tag, after, maxWaitMs = 60000 }) {
  const pollInterval = 4000;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, pollInterval));

    const params = new URLSearchParams({
      apikey:         apiKey,
      namespace:      namespace,
      tag:            tag,
      livequery:      'false',
      timestamp_from: after.toString(),
    });

    const url = `https://api.testmail.app/api/json?${params}`;

    const result = await new Promise((resolve, reject) => {
      const req = https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse testmail response: ${e.message}`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('Poll request timed out')); });
    });

    if (!result.emails || result.emails.length === 0) continue;

    const otpEmail = result.emails.find(e =>
      e.subject && e.subject.toLowerCase().includes('passcode')
    ) || result.emails[0];

    const raw = otpEmail.html || otpEmail.text || '';
    const stripped = raw.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
    const match = stripped.match(/\b(\d{6})\b/);
    if (match) return match[1];
  }

  throw new Error('OTP not received within timeout — check testmail inbox and credentials');
}

module.exports = { getOtp };
