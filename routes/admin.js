import express from 'express';

import { banUser, suspendUser } from '../controllers/admin.js';
import { restrictTo } from '../middlewares/auth.js';

const router = express.Router();

router.post('/suspend/:userId', restrictTo(["ADMIN"]), suspendUser);
router.delete('/ban/:userId', restrictTo(["ADMIN"]), banUser);

export default router;