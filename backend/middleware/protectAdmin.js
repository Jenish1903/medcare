const jwt = require('jsonwebtoken');
const pool = require('../config/db');  // Make sure to import your db connection
require('dotenv').config();  // To load environment variables

const protect = async (req, res, next) => {
    let token;

    // Check if token is in the authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ StatusMessage: 'Not authorized, no token' });
    }

    try {
        // Verify the token using JWT_SECRET from environment variables
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Query to fetch user from the database using decoded user ID
        const [rows] = await pool.execute(
            'SELECT id, name, email, role FROM tbl_admin WHERE id = ?',
            [decoded.userId]
        );

        if (rows.length === 0) {
            return res.status(401).json({ StatusMessage: 'Admin not found' });
        }

        const user = rows[0];

        // Check if the user has admin role (role = 1)
        if (user.role !== 1) {
            return res.status(403).json({ StatusMessage: 'Forbidden, admin access required' });
        }

        req.user = user;  // Attach user data to the request object for use in the route
        next();  // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ StatusMessage: 'Not authorized, token failed' });
    }
};

module.exports = protect;