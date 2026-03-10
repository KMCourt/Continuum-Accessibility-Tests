require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { loginAndSave } = require('./auth');

module.exports = async () => {
  await loginAndSave(
    process.env.CONDRIVER_URL,
    process.env.CONDRIVER_EMAIL,
    process.env.CONDRIVER_PASSWORD,
    'condriver-auth.json'
  );
};