const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const authenticate = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            Status: 'False',
            StatusMessage: 'Not authorized, no token provided.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(403).json({
                Status: 'False',
                StatusMessage: 'Invalid token payload: missing user ID.'
            });
        }

        const [rows] = await pool.execute(
            'SELECT id, name, email, role FROM tbl_user WHERE id = ?',
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(403).json({
                Status: 'False',
                StatusMessage: 'User not found for the provided token.'
            });
        }

        // The fix is here:
        // You need to get the user object from the 'rows' array
        const user = rows[0];

        req.user = {
            id: user.id,
            name: user.name,
            role: user.role
        };
        next();

    } catch (error) {
        console.error('Authentication middleware error:', error.message);
        return res.status(403).json({
            Status: 'False',
            StatusMessage: `Not authorized, token failed: ${error.message}`
        });
    }
};

module.exports = authenticate;