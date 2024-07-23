if (process.env.NODE_ENV !== "production") require("dotenv").config();

const express = require("express");
const methodOverride = require("method-override");
const app = express();
const port = 8080;

// Setting up server with hbs and methodOverride
const hbs = require("express-handlebars").create({
  layoutsDir: __dirname + "/views/layouts",
  partialsDir: __dirname + "/views/partials",
  extname: "hbs",
  defaultLayout: "main",
  runtimeOptions: {
    allowProtoMethodsByDefault: true,
    allowProtoPropertiesByDefault: true,
  },
});

app.set("port", process.env.PORT || port);
app.set("view engine", "hbs");
app.engine("hbs", hbs.engine);
app.use(express.static("public"));
app.use(methodOverride("_method"));

// Setting up server with Mongoose
const mongoose = require("mongoose");
mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;

db.on("error", (err) => {
  console.error(err);
});

db.once("open", () => {
  console.log("Connected to Mongoose!");
});

// Body parser
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ limit: "10mb", extended: false }));

// Routes
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");

app.use("/", indexRouter);
app.use("/users", usersRouter);

app.listen(app.get("port"), () => {
  console.log("Server started at http://localhost:" + app.get("port"));
});
