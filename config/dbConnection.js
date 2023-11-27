
const mongoose = require('mongoose');

const connectDb = async() => {
    try{
        const connect = await mongoose.connect(process.env.CONNECTION_STRING, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 200, 
            connectTimeoutMS: 10000, 
            socketTimeoutMS: 45000, 
            serverSelectionTimeoutMS: 5000,
        });
        console.log(
         "Database connected: ",
         connect.connection.host,
         connect.connection.name);
    }catch(err){
        console.log(err);
        process.exit(1);
    }
};
process.on('SIGINT', async () => {
    try {
        await mongoose.disconnect();
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error while closing the mongoose connection', err);
        process.exit(1);
    }
});


module.exports = connectDb;