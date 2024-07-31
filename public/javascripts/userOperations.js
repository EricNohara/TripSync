const User = require("../../models/user");
const jwt = require("jsonwebtoken");
const errorContent = "Please Sign In";

// Middleware for JWT validation
function verifyToken(req, res, next) {
  const token =
    req.cookies?.token || req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.redirect(`/authError?errorMessage=${errorContent}`);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.redirect(`/authError?errorMessage=${errorContent}`);
    } else {
      req.user = decoded;
      next();
    }
  });
}

async function retrieveUser(req, res) {
  try {
    if (req.user == null) throw "Error: No User";
    return await User.findById(req.user.userID);
  } catch {
    res.redirect("/");
  }
}

// Used to check if search field has valid characters
function isAlphaNumeric(str) {
  const len = str.length;
  let code;

  for (let i = 0; i < len; i++) {
    code = str.charCodeAt(i);
    if (
      !(code > 47 && code < 58) && // numeric (0-9)
      !(code > 64 && code < 91) && // upper alpha (A-Z)
      !(code > 96 && code < 123) // lower alpha (a-z)
    ) {
      return false;
    }
  }
  return true;
}

// Used to load all users based on query
async function getSearchableUsers(req) {
  let searchOptions = {};

  if (!req.query.username || req.query.username === "") return [];
  else if (!isAlphaNumeric(req.query.username)) return [];
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
  isAlphaNumeric,
};
