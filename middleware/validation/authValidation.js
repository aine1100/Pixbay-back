import Joi from "joi";

/**
 * Higher-order function to create a validation middleware
 * @param {Joi.ObjectSchema} schema - The Joi schema to validate against
 */
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(", ");
        return res.status(400).json({
            success: false,
            message: errorMessage
        });
    }
    
    next();
};

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    role: Joi.string().valid("CLIENT", "CREATOR").optional()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required(),
    newPassword: Joi.string().min(6).required()
});

const verifyAccountSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required()
});

export const validateRegister = validate(registerSchema);
export const validateLogin = validate(loginSchema);
export const validateForgotPassword = validate(forgotPasswordSchema);
export const validateResetPassword = validate(resetPasswordSchema);
export const validateVerifyAccount = validate(verifyAccountSchema);
