const User = require("../../models/user");
const jwt = require("jsonwebtoken");
const errorContent = "Unauthorized";

// Middleware for JWT validation
function verifyToken(req, res, next) {
  const token =
    req.cookies?.token || req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    req.authError = errorContent;
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      req.authError = errorContent;
    }
    req.user = decoded;
    next();
  });
}

async function retrieveUser(req, res) {
  try {
    if (req.user == null) throw "Error: No User";
    return await User.findOne({ email: req.user.email });
  } catch {
    res.redirect("/");
  }
}

module.exports = {
  verifyToken,
  retrieveUser,
};
