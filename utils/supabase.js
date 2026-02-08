import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultBucket = process.env.SUPABASE_BUCKET || "pixbay";

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials are missing. File uploads will fail.");
}
console.log("Connected to supabase successfully");

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload a file to a Supabase storage bucket
 * @param {string} path - The destination path within the bucket
 * @param {Buffer|Blob|File} file - The file content to upload
 * @param {string} bucket - The name of the bucket (optional, defaults to SUPABASE_BUCKET)
 * @param {Object} options - Additional options (contentType, etc.)
 */
export const uploadFile = async (path, file, bucket = defaultBucket, options = {}) => {
    const { data: _data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            upsert: true,
            ...options
        });

    if (error) {
        throw new Error(`Supabase Upload Error: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return publicUrl;
};

/**
 * Delete a file or files from Supabase storage
 * @param {string|string[]} paths - Path or array of paths to delete
 * @param {string} bucket - The name of the bucket
 */
export const deleteFiles = async (paths, bucket = defaultBucket) => {
    const pathsArray = Array.isArray(paths) ? paths : [paths];
    const { data: _data, error } = await supabase.storage
        .from(bucket)
        .remove(pathsArray);

    if (error) {
        console.error(`Supabase Delete Error: ${error.message}`);
        // We don't necessarily throw here to avoid interrupting a main error handler,
        // but it's available if needed.
    }
    return _data;
};
