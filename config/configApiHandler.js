


let keys = process.env.SPOONACULAR_API_KEY.split(',');

function getApiKey() {
  const key = keys[0];
  keys = [...keys.slice(1), key];
  return key;
}

module.exports = {
  baseUrl: process.env.BASE_SPOONACULAR_API_URL,
  getApiKey,
};