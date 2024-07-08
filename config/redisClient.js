const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URI);

async function checkRedisConnection() {
  try {
    await redis.ping();
  } catch (error) {}
}

checkRedisConnection();

module.exports = redis;
