const {createLogger, transports, format} = require('winston');

const logger = createLogger({	

		transports: [
			 new transports.Console(),
			 new transports.File({ level:'warn' , filename: './logs/logsWarnings.log' }),
			 new transports.File({ level:'info' , filename: './logs/logsInfo.log' }),
			 new transports.File({ level:'debug' , filename: './logs/logsDebug.log' }),
			 new transports.File({ level:'error' , filename: './logs/logsErrors.log' }),
			
		],
		format: format.combine(
			 format.colorize(),
			 format.timestamp(),
			 format.metadata(),
			 format.prettyPrint(),
			 format.json()
		),
		
		
});

module.exports = logger;