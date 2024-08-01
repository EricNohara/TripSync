if (process.env.NODE_ENV !== "production") require("dotenv").config();

const express = require("express");
const methodOverride = require("method-override");
const cookieParser = require("cookie-parser");
const User = require("./models/user");
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
  helpers: {
    isRegisterForm: (loginOrRegister) => {
      return loginOrRegister === "Sign Up";
    },
    getUserPath: (user) => {
      return user != null ? `/users/${user.id}` : "/";
    },
    getDefaultDate: () => {
      const date = new Date();
      return date.toISOString().split("T")[0];
    },
    convertReadableDate: (date) => {
      return date.toISOString().split("T")[0];
    },
    folderIsNotEmpty: (tripFolder) => {
      return tripFolder.tripFiles.length > 0 ? true : false;
    },
    equals: (a, b) => {
      return a === b;
    },
  },
});

app.set("port", process.env.PORT || port);
app.set("view engine", "hbs");
app.engine("hbs", hbs.engine);
app.use(express.static("public"));
app.use(methodOverride("_method"));
app.use(express.json());
app.use(cookieParser());

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
const tripFoldersRouter = require("./routes/tripFolders");
// const tempDevRouter = require("./routes/tempDev");

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/tripFolders", tripFoldersRouter);
// app.use("/tempDev", tempDevRouter);

app.listen(app.get("port"), () => {
  console.log("Server started at http://localhost:" + app.get("port"));
});
