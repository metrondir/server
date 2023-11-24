const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const connectDb = require('./config/dbConnection');
const dotenv = require("dotenv").config();
const cookieParser = require('cookie-parser');
const cors = require('cors');


connectDb();
const port = process.env.PORT || 5000;
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors());


app.use("/api/recipes", require("./routes/recipeRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use(errorHandler);


app.listen(port,()=>{
    console.log(`Server running on port ${port}`);
});

