const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URI);

async function checkRedisConnection() {
	try {
	  await redis.ping(); // A simple command to check if the server is available
	  console.log("Redis connection is established.");
	} catch (error) {
	  console.error("Unable to connect to Redis:", error.message);
	}
 }
 
 // Call the function to check Redis connection
 checkRedisConnection();
 
module.exports = redis;
