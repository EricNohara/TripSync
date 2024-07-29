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

// helper function to load all users based on query
async function getSearchableUsers(req) {
  let searchOptions = {};

  if (!req.query.username || req.query.username === "") return [];
  else searchOptions.username = new RegExp(req.query.username, "i");
  searchOptions.isPrivate = false;

  try {
    const users = await User.find(searchOptions).limit(10);
    return users;
  } catch {
    return null;
  }
}

module.exports = {
  verifyToken,
  retrieveUser,
  getSearchableUsers,
};
