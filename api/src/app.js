const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const routes = require("./routes")
const app = express();
const multer = require("multer");

app.use(morgan("dev"));
app.use(cors({ origin: "*", methods: "POST,PUT,GET,DELETE,PATCH", maxAge: 86400 }));
app.use(express.json());
const uploader = multer({dest: "../contracts/"})

app.get("/health", (req, res) => {
  res.json({ message: "Api running", time: new Date() });
});

app.use("/v1", routes);

module.exports = app;
