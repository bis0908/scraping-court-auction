import cookieParser from "cookie-parser";
import { crawling } from "./models/search-service.js";
// import crawlingRouter from "./routes/crawling-router.js";
import createError from "http-errors";
import express from "express";
import fs from "fs";
import indexRouter from "./routes/index.js";
import { join } from "path";
import logger from "morgan";
import path from "path";

const app = express();
const __dirname = path.resolve(); // for ES module

const accessLogStream = fs.createWriteStream(join(__dirname, "./logs/access.log"), { flags: "a" });

// view engine setup
app.set("views", join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev", { stream: accessLogStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(join(__dirname, "public")));

app.use("/", indexRouter);

crawling();

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

export default app;
