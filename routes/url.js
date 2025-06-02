import express from 'express';

import { generateShortUrl, redirectToOriginal } from '../controllers/url.js';

const router = express.Router();

router.get('/:shortId', redirectToOriginal);

router.post('/', generateShortUrl);

export default router;