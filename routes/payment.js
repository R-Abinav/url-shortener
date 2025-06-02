import express from 'express';
import { handleOrderPayment, validateOrderPayment } from "../controllers/payment.js";

const router = express.Router();

router.post('/order', handleOrderPayment);
router.post('/order/validate', validateOrderPayment);

export default router;