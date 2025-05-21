import express from 'express';

import { generateShortUrl, generateAnalytics } from '../controllers/url.js';

const router = express.Router();

router.post('/', generateShortUrl);

router.get('/analytics/:shortId', generateAnalytics);


export default router;