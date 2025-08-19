import Form from '../Models/Form.model.js';
import Submission from '../Models/Submission.model.js';
import { body, validationResult } from 'express-validator';

export const getPublicForm = async (req, res, next) => {
    try {
        const form = await Form.findOneAndUpdate(
            { 'published.slug': req.params.slug, 'published.isPublished': true },
            { $inc: { views: 1 } },
            { new: true }
        );
         if (!form) return res.status(404).json({ message: 'Public form not found' });
         res.json({
      form: {
        id: form._id,
        title: form.title,
        description: form.description, // Add this line
        createdBy: form.createdBy,   // Add this line
        fields: form.published.fields,
      },
    });
    } catch (error) {
        console.error('Error fetching public form:', error);
        res.status(500).json({ message: 'Internal Server Error' });
        next(error);
    }
};  


export const validateSubmission = [
    async (req, res, next) => {
        const form = await Form.findOne({ 'published.slug': req.params.slug, 'published.isPublished': true });
        if (!form) {
            return res.status(404).json({ message: 'Public form not found' });
        }
        
        const validations = [];
        for (const field of form.published.fields) {
            if (field.config.required) {
                validations.push(body(`answers.${field.id}`).notEmpty().withMessage(`Field "${field.config.label}" is required.`));
            }
            if (field.type === 'email') {
                validations.push(body(`answers.${field.id}`).if(body(`answers.${field.id}`).notEmpty()).isEmail().withMessage(`Field "${field.config.label}" must be a valid email address.`));
            }
            if (field.type === 'number') {
                validations.push(body(`answers.${field.id}`).if(body(`answers.${field.id}`).notEmpty()).isNumeric().withMessage(`Field "${field.config.label}" must be a number.`));
            }
        }
        
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        req.form = form; 
        next();
    }
];


export const postSubmission = async (req, res, next) => {
     try {
        // 1. Get the form from the request object (passed from middleware)
        const form = req.form;

        // 2. REMOVE the old validation loop. It's now handled by the middleware.
        
        // Increment submissions count
        form.submissions += 1;
        await form.save();

        const sub = await Submission.create({
          form: form._id,
          answers: req.body?.answers || {},
          meta: {
            ip: req.ip,
            userAgent: req.headers['user-agent'] || '',
          },
        });

       

        res.status(201).json({ message: 'Submission received', submissionId: sub._id });
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({ message: 'Internal Server Error' });
    next(error);
  }
};