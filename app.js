//define packages/modules
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const cloudinaryConfig = require("./middlewares/cloudinary-config")
  .cloudinaryConfig;
const app = express();
const enforce = require("express-sslify");

app.use(enforce.HTTPS({ trustProtoHeader: true }));
app.use(
  cors({
    origin: "https://stark-spire-56927.herokuapp.com",
    credentials: true,
  })
);
app.use(cookieParser());
app.use("/public", express.static("public"));
app.use("*", cloudinaryConfig);
//essential parts
require("./startup/db")();
require("./startup/routes")(app);

//listen to server
const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`App runnin on port ${port}....`)
);
module.exports = server;
