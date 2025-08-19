import crypto from 'crypto';
import Form from '../Models/Form.model.js';
import Submission from '../Models/Submission.model.js';



/**
 * @desc    Get all forms
 * @route   GET /api/forms
 * @access  Public (for now)
 */
export const getAllForms = async (req, res, next) => {
  try {
    // We will get ownerId from a request header or query param
    const ownerId = req.query.ownerId;
     if (!ownerId) {
      return res.status(400).json({ message: 'Owner ID is required' });
    }
    //  Change sorting from createdAt to updatedAt to get the most recently worked on form first
    const forms = await Form.find({ ownerId }).sort({ createdAt: -1 });
    res.status(200).json({ forms });
  } catch (error) {
    console.error('Error fetching all forms:', error);
    res.status(500).json({ message: 'Internal Server Error' });
    next(error);
  }
};

/**
 * @desc    Delete a form and its submissions
 * @route   DELETE /api/forms/:id
 * @access  Public (for now)
 */
export const deleteForm = async (req, res, next) => {
  try {

    const formId = req.params.id;

     const { ownerId } = req.body;

    if (!ownerId) {
        return res.status(400).json({ message: 'Owner ID is required for deletion.' });
    }


    const form = await Form.findById(formId);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

     // *** SECURITY CHECK ***
    // **Verify that the user requesting deletion is the owner of the form**
    if (form.ownerId !== ownerId) {
        return res.status(403).json({ message: 'Forbidden: You are not the owner of this form.' });
    }

    // First, delete all submissions associated with the form
    await Submission.deleteMany({ form: formId });

    // Then, delete the form itself
    await Form.findByIdAndDelete(formId);
    
    // Notify all clients that the forms list has changed
    
    req.io.emit('forms_updated');

    res.status(200).json({ message: 'Form and all its submissions deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ message: 'Internal Server Error' });
    next(error);
  }
};

// generate humanish slug for published URLs

const makeSlug = () => {
     return crypto.randomBytes(6).toString('base64url');
}

export const createForm = async(req, res, next) => {
    try {
        // Get title and the new ownerId from the request body
         const { title, description, createdBy, ownerId } = req.body;
          if (!ownerId) {
           return res.status(400).json({ message: 'Owner ID is required to create a form' });
         }
           const form = await Form.create({
             title: title || 'Untitled Form',
            description: description || 'This is my form description.', // Add this
            createdBy: createdBy || 'Anonymous', // Add this
            ownerId: ownerId
         });
         // Notify all clients that the forms list has changed
        req.io.emit('forms_updated');

         res.status(201).json({ id: form._id, form });

        
    } catch (error) {
        console.error('Error creating form:', error);
        res.status(500).json({ message: 'Internal Server Error' });
        next(error);
    }
};

export const getForm = async(req, res, next) => {
    try {
         const form = await Form.findById(req.params.id);
         if (!form) return res.status(404).json({ message: 'Form not found' });
          // **Although public forms have a separate route, it's good practice**
        // **to consider if this endpoint should also be owner-restricted.**
        // **Assuming only the owner should access the form's builder state:**
         const { ownerId } = req.query;
        if (form.ownerId !== ownerId) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to this form.'});
        }
         res.status(200).json({ form });
    } catch (error) {
        console.error('Error fetching form:', error);
        res.status(500).json({ message: 'Internal Server Error' });
        next(error);
    }
};


/**
 * @desc    Update a form's title, description, and fields
 * @route   PUT /api/forms/:id
 * @access  Public (for now)
 */
export const updateForm = async (req, res, next) => {
  try {
    const { ownerId, title, description, fields } = req.body;

    if (!ownerId) {
      return res.status(400).json({ message: 'Owner ID is required to update.' });
    }

    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    if (form.ownerId !== ownerId) {
      return res.status(403).json({ message: 'Forbidden: You are not the owner of this form.' });
    }

    form.title = title || form.title;
    form.description = description || form.description;
    form.fields = fields || form.fields;

    const updatedForm = await form.save();

    res.status(200).json({
      message: 'Form updated successfully!',
      form: updatedForm
    });

  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({ message: 'Internal Server Error' });
    next(error);
  }
};


// Publish – freezes current draft into read-only snapshot
export const publishForm = async (req, res, next) => {
    try {
         // **Get ownerId from the request body for verification**
        const { ownerId, title, description, fields } = req.body;
        if (!ownerId) {
            return res.status(400).json({ message: 'Owner ID is required to publish.' });
        }
        
        const form = await Form.findById(req.params.id);
        if (!form) return res.status(404).json({ message: 'Form not found' });

        // *** SECURITY CHECK ***
        if (form.ownerId !== ownerId) {
            return res.status(403).json({ message: 'Forbidden: You are not the owner of this form.' });
        }

        // Update form fields
        if (title) form.title = title;
        if (description) form.description = description;
        if (fields) form.fields = fields;

        // Generate a slug only on the first publish
        if (!form.published.slug) {
            form.published.slug = makeSlug();
        }

        // Update published state
        form.published = {
            isPublished: true,
            slug: form.published.slug || makeSlug(),
            fields: fields || form.fields, // Use new fields if provided, otherwise use existing
            publishedAt: new Date()
        };

        await form.save();

        // --- CORRECTED RESPONSE ---
        // Send a single, combined response
        res.status(200).json({
            message: "Form published successfully!",
            slug: form.published.slug,
            url: `/form/${form.published.slug}`,
            form: form // Send the full updated form object
        });

    } catch (error) {
        console.error('Error publishing form:', error);
        res.status(500).json({ message: 'Internal Server Error' });
        next(error);
    }
};

// Owner-side: list submissions for a form

export const getSubmissions = async(req, res, next) => {
    try {
         const { ownerId } = req.query;
        if (!ownerId) {
            return res.status(400).json({ message: 'Owner ID is required to view submissions.' });
        }
        const form = await Form.findById(req.params.id);
        if (!form) {
            return res.status(404).json({ message: 'Form not found' });
        }

        // *** SECURITY CHECK ***
        if (form.ownerId !== ownerId) {
            return res.status(403).json({ message: 'Forbidden: You cannot view these submissions.' });
        }

         const subs = await Submission.find({ form: req.params.id }).sort({ createdAt: -1 });
    res.json({ submissions: subs });
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ message: 'Internal Server Error' });
        next(error);
    }
}