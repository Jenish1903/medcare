const jwt = require('jsonwebtoken');
const { User } = require('../models/userModal');  // Sequelize model
require('dotenv').config();

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      Status: "False",
      StatusMessage: "Authorization token missing or malformed",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(403).json({
        Status: "False",
        StatusMessage: "Invalid token payload",
      });
    }

    const user = await User.findOne({
      where: {
        id: decoded.id,
        statusFlag: 1,
      },
    });

    if (!user) {
      return res.status(403).json({
        Status: "False",
        StatusMessage: "User not found or inactive",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(403).json({
      Status: "False",
      StatusMessage: "Token verification failed",
    });
  }
};

module.exports = authenticateUser;
