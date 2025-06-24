const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.post('/add', cartController.addToCart);
router.get('/:user_id', cartController.getCart);
router.put('/update', cartController.updateCartItem);
router.delete('/:id', cartController.deleteCartItem);

module.exports = router;
