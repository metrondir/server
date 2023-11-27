const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const connectDb = require('./config/dbConnection');
const dotenv = require("dotenv").config();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('compression');
const expressWinston = require('express-winston');
const corsOptions = require('./middleware/corsOptions');
const {transports,format } = require('winston');
const helmet = require('helmet'); 
require('winston-mongodb');
const logger = require('./utils/logger');


connectDb();
const port = process.env.PORT || 5000;
const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use(expressWinston.logger({
    winstonInstance: logger,
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
    statusLevels: true,
    colorize: true,
}));
app.use(compression());

app.use("/api/recipes", require("./routes/recipeRoutes" ));
app.use("/api/users", require("./routes/userRoutes"));


app.use(errorHandler);

const myFormat = format.printf(({ level, message, label, timestamp, metadata }) => {
    return `${timestamp} ${level}: ${message} ${metadata ? JSON.stringify(metadata) : ''}`;
  });
app.use(expressWinston.errorLogger({
     transports:[
        new transports.File({
        filename: './logs/logsErrors.log'
        }), 
    ],
    format: format.combine(
        format.json(),
        format.timestamp(),
        myFormat
    ),
}));



//const ngrok = require('ngrok');
//(async function() {
//  const url = await ngrok.connect();
//})();

app.listen(port,()=>{
    console.log(`Server running on port ${port}`);
});




