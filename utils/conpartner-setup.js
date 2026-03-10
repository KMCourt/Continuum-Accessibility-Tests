require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { loginAndSave } = require('./auth');

module.exports = async () => {
  await loginAndSave(
    process.env.CONPARTNER_URL,
    process.env.CONPARTNER_EMAIL,
    process.env.CONPARTNER_PASSWORD,
    'conpartner-auth.json'
  );
};