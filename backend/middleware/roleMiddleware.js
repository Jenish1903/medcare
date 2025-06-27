const authorizeRoles = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                Status: 'False',
                StatusMessage: 'Authentication required. User role not found on request.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            console.warn(`Access denied for user ID ${req.user.id} with role "${req.user.role}". Required roles: ${allowedRoles.join(', ')}`);
            return res.status(403).json({
                Status: 'False',
                StatusMessage: 'Forbidden: You do not have the necessary role to access this resource.'
            });
        }
        next();
    };
};

module.exports = authorizeRoles;