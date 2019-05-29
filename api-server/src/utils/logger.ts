const winston = require('winston');
require('winston-daily-rotate-file');

const transport = new (winston.transports.DailyRotateFile)({
    filename: 'api-%DATE%.log',
    dirname: '/tmp/serverlog/',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '100m',
    maxFiles: '7d'
});


export class LogService {
    logger;

    constructor() {
        this.logger = winston.createLogger({
            transports: [
                 transport
             ]
        });
    }

    getLogger() {
        return this.logger;
    }

}
