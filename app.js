//define packages/modules
require("dotenv").config();
const express = require("express");
// const cors = require("cors");
const cookieParser = require("cookie-parser");
const cloudinaryConfig = require("./middlewares/cloudinary-config")
  .cloudinaryConfig;
const app = express();

const whitelist = [
  "https://stark-spire-56927.herokuapp.com",
  "http://localhost:4200",
];
app.use(function (req, res, next) {
  const origin = req.headers.origin;
  if (whitelist.indexOf(origin) > -1) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type,x-auth-token"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);

  if (req.method === "OPTIONS") {
    res.status(200);
  }
  next();
});

app.use(cookieParser());
app.use("/public", express.static("public"));
app.use("*", cloudinaryConfig);

require("./startup/db")();
require("./startup/routes")(app);

//listen to server
const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`App runnin on port ${port}....`)
);
module.exports = server;
