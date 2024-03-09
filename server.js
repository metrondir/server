const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const connectDb = require("./config/dbConnection");

const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv").config();
const compression = require("compression");
const expressWinston = require("express-winston");
const { transports, format } = require("winston");
const helmet = require("helmet");
require("winston-mongodb");
const logger = require("./utils/logger");
connectDb();
const port = process.env.PORT || 5000;
const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const allowedOrigins = [
  "http://localhost:3000",
  "https://granny-recipes.vercel.app",
  "https://https://granny-recipes-git-main-crazytimes-projects.vercel.app",
  "https://granny-recipes-git-main-crazytimes-projects.vercel.app",
];

app.use(
  cors({
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    origin: function (origin, callback) {
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

app.use(cookieParser());
app.use(
  expressWinston.logger({
    winstonInstance: logger,
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
    statusLevels: true,
    colorize: true,
  }),
);
app.use(compression());

app.use("/api/recipes", require("./routes/recipeRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/spoonacular/recipes", require("./routes/apiRoutes"));

app.use(errorHandler);

const myFormat = format.printf(
  ({ level, message, label, timestamp, metadata }) => {
    return `${timestamp} ${level}: ${message} ${metadata ? JSON.stringify(metadata) : ""}`;
  },
);
app.use(
  expressWinston.errorLogger({
    transports: [
      new transports.File({
        filename: "./logs/logsErrors.log",
      }),
    ],
    format: format.combine(format.json(), format.timestamp(), myFormat),
  }),
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
