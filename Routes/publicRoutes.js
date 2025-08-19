import { Router } from 'express';
import { getPublicForm, postSubmission, validateSubmission } from "../Controllers/publicController.js";

const router = Router();
router.get('/forms/:slug', getPublicForm);
router.post('/forms/:slug/submit', validateSubmission, postSubmission);

export default router;