const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role }, // ✅ Include role here
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = { generateToken };
