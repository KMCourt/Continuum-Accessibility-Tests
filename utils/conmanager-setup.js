require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { loginAndSave } = require('./auth');

module.exports = async () => {
  await loginAndSave(
    process.env.CONMANAGER_URL,
    process.env.CONMANAGER_EMAIL,
    process.env.CONMANAGER_PASSWORD,
    'conmanager-auth.json'
  );
};