import multer from "multer";

/**
 * Filter for allowed image types
 */
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only images are allowed"), false);
    }
};

/**
 * Filter for portfolio items (Images, Videos, PDFs)
 */
const portfolioFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/webm",
        "application/pdf"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("File type not supported for portfolio"), false);
    }
};

/**
 * Filter for ID verification documents
 */
const documentFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("ID proof must be an image or PDF"), false);
    }
};

const storage = multer.memoryStorage();

export const uploadProfile = multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

export const uploadPortfolioMedia = multer({
    storage,
    fileFilter: portfolioFilter,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

export const uploadIdentity = multer({
    storage,
    fileFilter: documentFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

export const uploadAttachment = multer({
    storage,
    fileFilter: portfolioFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
