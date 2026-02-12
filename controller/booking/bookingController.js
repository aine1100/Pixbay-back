import * as bookingService from "../../service/booking/booking.js";
import { uploadFile, deleteFiles } from "../../utils/supabase.js";

export const create = async (req, res) => {
    try {
        const clientId = req.user.id;
        const booking = await bookingService.createBooking(clientId, req.body);
        res.status(201).json({
            success: true,
            data: booking
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const list = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const bookings = await bookingService.getUserBookings(userId, role);
        res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const getOne = async (req, res) => {
    try {
        const userId = req.user.id;
        const booking = await bookingService.getBookingById(req.params.id, userId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or unauthorized"
            });
        }
        res.status(200).json({
            success: true,
            data: booking
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const booking = await bookingService.updateBookingStatus(req.params.id, req.user.id, status);
        res.status(200).json({
            success: true,
            data: booking
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const remove = async (req, res) => {
    try {
        const userId = req.user.id;
        await bookingService.deleteBooking(req.params.id, userId);
        res.status(200).json({
            success: true,
            message: "Booking deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const checkIn = async (req, res) => {
    try {
        const { id: bookingId } = req.params;
        const { sessionNumber, location } = req.body;
        const userId = req.user.id;

        const session = await bookingService.registerCheckIn(bookingId, userId, sessionNumber, location);
        res.status(200).json({
            success: true,
            message: `Check-in successful for session #${sessionNumber}`,
            data: session
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Handle delivery media uploads for a booking
 */

export const uploadDelivery = async (req, res) => {
    const uploadedPaths = [];
    try {
        const { id: bookingId } = req.params;
        const userId = req.user.id;
        const items = [];

        // Upload files to Supabase if present
        if (req.files && req.files.delivery) {
            await Promise.all(req.files.delivery.map(async (file) => {
                const type = file.mimetype.startsWith("image/") ? "IMAGE" :
                    file.mimetype.startsWith("video/") ? "VIDEO" : "DOCUMENT";

                const path = `bookings/${bookingId}/${Date.now()}_${file.originalname}`;
                const url = await uploadFile(path, file.buffer, undefined, { contentType: file.mimetype });
                uploadedPaths.push(path);

                items.push({
                    type,
                    url,
                    metadata: {
                        originalName: file.originalname,
                        size: file.size,
                        mimeType: file.mimetype
                    }
                });
            }));
        }

        // Add links if provided (e.g. Google Drive, YouTube)
        let { links } = req.body;
        if (links) {
            const linksArray = Array.isArray(links) ? links : [links];
            linksArray.forEach(link => {
                items.push({
                    type: "LINK",
                    url: link,
                    metadata: {
                        title: "External Delivery Link"
                    }
                });
            });
        }

        if (items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No media or links provided for delivery"
            });
        }

        const booking = await bookingService.uploadBookingMedia(bookingId, userId, items);

        res.status(200).json({
            success: true,
            message: "Project media uploaded successfully",
            data: booking.delivery
        });
    } catch (error) {
        // ROLLBACK: Delete files from Supabase if DB operation failed
        if (uploadedPaths.length > 0) {
            await deleteFiles(uploadedPaths).catch(e => console.error("Booking delivery rollback failed:", e));
        }
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
