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
const ngrok = require('ngrok');
(async function() {
  const url = await ngrok.connect();
})();

app.listen(port,()=>{
    console.log(`Server running on port ${port}`);
});

