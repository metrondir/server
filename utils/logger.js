const { createLogger, transports, format } = require("winston");

const logger = createLogger({
  transports: [
    new transports.Console(),
    new transports.File({ level: "warn", filename: "./logs/logsWarnings.log" }),
    new transports.File({ level: "info", filename: "./logs/logsInfo.log" }),
    new transports.File({ level: "debug", filename: "./logs/logsDebug.log" }),
    new transports.File({ level: "error", filename: "./logs/logsErrors.log" }),
  ],
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.metadata(),
    format.prettyPrint(),
    format.json(),
  ),
});

module.exports = logger;

//const {format , createLogger,transports} = require('winston');
//const {v4: uuid} = require('uuid');
//const {AsyncLocalStorage} = require('async_hooks');

//// Initialize an asyncLocalStorage to trace logs down to a specific request.

//const asyncLocalStorage = new AsyncLocalStorage();

//// Create a winston format to add the traceId information based on asyncLocalStorage
//// This function will be run at each log entry.
//const uuidFormat = format((info, opts) => {
//  return {
//    ...info,
//    traceId: asyncLocalStorage.getStore()
//  }
//})

//// Define a middleware and wrap the next() function into
//// the asyncLocalStorage.run() in order to initialize tracing
//// of the request
// const loggerMiddleware = (req, res, next) => {
//  asyncLocalStorage.run(uuid(), () => {
//    next()
//  })
//}

//// Create a logger using our uuidFormat to inject our traceId into logs
// const logger = createLogger({

//  transports: [
//   new transports.Console(),
//	new transports.Console(),
//	new transports.File({ level:'warn' , filename: './logs/logsWarnings.log' }),
//	new transports.File({ level:'info' , filename: './logs/logsInfo.log' }),
//	new transports.File({ level:'debug' , filename: './logs/logsDebug.log' }),
//	new transports.File({ level:'error' , filename: './logs/logsErrors.log' }),

//  ],
//  format: format.combine(
//    format.timestamp(),
//    uuidFormat(),
//    format.json(),
//	 format.colorize(),
//	 format.metadata(),
//	 format.prettyPrint(),
//  ),
//});

//module.exports = {logger, loggerMiddleware};
