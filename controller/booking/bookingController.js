import * as bookingService from "../../service/booking/booking.js";

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
