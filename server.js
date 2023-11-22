const express = require("express");
const errorHandler = require("./midlware/errorHandler");
const connectDb = require('./config/dbConnection');
const dotenv = require("dotenv").config();
const cors = require('cors');


connectDb();
const app = express();

app.use(cors({
  origin: "http://localhost:3000",
}));
const port = process.env.PORT || 5000;

app.use(express.json());

app.use("/api/recipes", require("./routes/recipeRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use(errorHandler);
// Add headers before the routes are defined
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json')

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});
const ngrok = require('ngrok');
(async function() {
  const url = await ngrok.connect();
})();
app.listen(port,()=>{
    console.log(`Server running on port ${port}`);
});

