


let keys = process.env.SPOONACULAR_API_KEY.split(',');

function getApiKey(isExpired = false) {
  const key = keys[0];
  if (isExpired) {
    keys = keys.slice(1);
  } else {
    keys = [...keys.slice(1), key];
  }
  return key;
}

module.exports = {
  baseUrl: process.env.BASE_SPOONACULAR_API_URL,
  getApiKey,
};