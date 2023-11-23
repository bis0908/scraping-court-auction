import DailyRotateFile from "winston-daily-rotate-file";
import moment from "moment-timezone";
import path from "path";
import winston from "winston";

// Resolve the current directory path
const __dirname = path.resolve();

// Set the project root path as the parent directory of the current directory
const PROJECT_ROOT = path.join(__dirname, "..");

// Define the log format with a custom timestamp
const myFormat = winston.format.printf(({ level, message, timestamp }) => {
  const time = moment(timestamp).tz("Asia/Seoul").format("YYYY-MM-DD HH:mm:ss");
  return `[${time}] [${level}] ${message}`;
});

// Configure the console transport to log to the console with the custom format
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(winston.format.colorize(), myFormat),
});

// Configure daily rotate file transports for info, debug, warning, and error logs
const loggingTransport = new DailyRotateFile({
  level: "info",
  filename: path.join(process.cwd(), "logs", "SCA-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: false,
  maxSize: "10m",
  maxFiles: "14d",
  format: myFormat,
});

// Create a logger instance with the custom format and transports
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), myFormat),
  transports: [consoleTransport, loggingTransport],
});

// Define a stream function for the logger that will be used by the morgan middleware
logger.stream = {
  write: function (message) {
    logger.info(message);
  },
};

// Define a function to format log arguments with additional stack trace information
function formatLogArguments(args) {
  args = Array.prototype.slice.call(args);

  const stackInfo = getStackInfo(1);
  // If stack information is available, add it to the log message
  if (stackInfo) {
    const calleeStr = `[${path.basename(stackInfo.relativePath)}:${stackInfo.line}]`;

    if (typeof args[0] === "string") {
      args[0] = `${calleeStr} ${args[0]}`;
    } else {
      args.unshift(calleeStr);
    }
  }

  return args;
}

// Define a function to get information about the calling function from the stack trace
function getStackInfo(stackIndex) {
  const stackList = new Error().stack.split("\n").slice(3);

  const stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi;
  const stackReg2 = /at\s+()(.*):(\d*):(\d*)/gi;

  const s = stackList[stackIndex] || stackList[0];
  const sp = stackReg.exec(s) || stackReg2.exec(s);

  if (sp && sp.length === 5) {
    return {
      method: sp[1],
      relativePath: path.relative(PROJECT_ROOT, sp[2]),
      line: sp[3],
      pos: sp[4],
      file: path.basename(sp[2]),
      stack: stackList.join("\n"),
    };
  }
}

logger.debug = function () {
  logger.log({ level: "debug", message: formatLogArguments(arguments).join(" ") });
};

logger.info = function () {
  logger.log({ level: "info", message: formatLogArguments(arguments).join(" ") });
};

logger.warn = function () {
  logger.log({ level: "warn", message: formatLogArguments(arguments).join(" ") });
};

logger.error = function () {
  logger.log({ level: "error", message: formatLogArguments(arguments).join(" ") });
};

export default logger;
