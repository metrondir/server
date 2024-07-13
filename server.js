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
const http = require("http"); // Required for creating HTTP server
const socketIo = require("socket.io"); // Import socket.io

const port = process.env.PORT || 5000;
const app = express();

// Connect to the database
connectDb();

// Disable 'x-powered-by' header for security
app.disable("x-powered-by");

// Use Helmet for security
app.use(helmet());

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:3000",
  "https://granny-recipes.vercel.app",
  "https://granny-recipes-git-main-crazytimes-projects.vercel.app",
];

// Use CORS with specified options
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

// Use cookie parser
app.use(cookieParser());

// Use express-winston logger for request logging
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

// Use compression for response compression
app.use(compression());

// Define routes
app.use("/api/recipes", require("./routes/recipeRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/spoonacular/recipes", require("./routes/apiRoutes"));

// Attach io to the request object
app.use((req, res, next) => {
  req.app.set("io", io);
  next();
});

// Corrected route for comment routes
app.use("/api/recipes/comments", require("./routes/commentRoutes"));

// Use custom error handler middleware
app.use(errorHandler);

// Format for winston logging
const myFormat = format.printf(
  ({ level, message, label, timestamp, metadata }) => {
    return `${timestamp} ${level}: ${message} ${metadata ? JSON.stringify(metadata) : ""}`;
  },
);

// Use express-winston error logger for error logging
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

// Create HTTP server and integrate socket.io
const server = http.createServer(app);
const io = socketIo(server);

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
