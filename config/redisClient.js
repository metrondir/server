const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URI);

async function checkRedisConnection() {
	try {
	  await redis.ping(); 
	  console.log("Redis connection is established.");
	} catch (error) {
	  console.error("Unable to connect to Redis:", error.message);
	}
 }


 checkRedisConnection();
 
module.exports = redis;
