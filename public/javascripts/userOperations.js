const User = require("../../models/user");
const jwt = require("jsonwebtoken");

// Middleware for JWT validation
function verifyToken(req, res, next) {
  const token =
    req.cookies?.token || req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    req.authError = "Unauthorized: Please Log In";
    // return res.render("index", {
    //   errorMessage: "Unauthorized. Please Log In.",
    // });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      req.authError = "Unauthorized: Please Log In";
      // return res.render("index", {
      //   errorMessage: "Unauthorized. Please Log In.",
      // });
    }
    req.user = decoded;
    next();
  });
}

async function retrieveUser(req) {
  try {
    if (req.user == null) throw "Error: No User";
    return await User.findOne({ email: req.user.email });
  } catch {
    res.redirect("/");
  }
}

function handleVerifyTokenError(req, res, displayError = true) {
  if (
    req.authError &&
    req.authError === "Unauthorized: Please Log In" &&
    displayError
  ) {
    return res.render("index", { errorMessage: req.authError });
  }
}

module.exports = {
  verifyToken,
  retrieveUser,
  handleVerifyTokenError,
};
