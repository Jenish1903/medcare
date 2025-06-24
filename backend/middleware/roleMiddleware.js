const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        Status: "False",
        StatusMessage: "Access denied: insufficient role",
      });
    }
    next();
  };
};

module.exports = authorizeRoles;
