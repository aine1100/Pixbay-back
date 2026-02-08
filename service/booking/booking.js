import prisma from "../../prisma/client.js";
import { notifyUser } from "../notification/notification.js";

/**
 * Create a new booking
 */
export const createBooking = async (clientId, bookingData) => {
    const { creatorId, serviceType, category, bookingDetails, pricing } = bookingData;

    // Generate a unique booking number
    const bookingNumber = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let booking;
    try {
        booking = await prisma.booking.create({
            data: {
                bookingNumber,
                clientId,
                creatorId,
                serviceType,
                category,
                bookingDetails,
                pricing,
                status: "PENDING"
            },
            include: {
                client: { select: { firstName: true, lastName: true } },
                creator: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            }
        });

        // Notify Creator
        await notifyUser(booking.creator.user.id, {
            type: "BOOKING",
            title: "New Booking Request",
            message: `You have a new booking request from ${booking.client.firstName} ${booking.client.lastName}`,
            metadata: { bookingId: booking.id, type: "NEW_BOOKING" }
        });

        return booking;
    } catch (error) {
        // ROLLBACK: If booking was created but notification failed
        if (booking?.id) {
            await prisma.booking.delete({ where: { id: booking.id } }).catch(() => { });
        }
        throw error;
    }
};

/**
 * Get booking by ID
 */
export const getBookingById = async (id, userId) => {
    return await prisma.booking.findFirst({
        where: {
            id,
            OR: [
                { clientId: userId },
                { creator: { userId } }
            ]
        },
        include: {
            client: {
                select: { firstName: true, lastName: true, email: true }
            },
            creator: {
                include: {
                    user: { select: { firstName: true, lastName: true } }
                }
            },
            sessions: true,
            chat: true
        }
    });
};

/**
 * Get all bookings for a user (Client or Creator)
 */
export const getUserBookings = async (userId, role) => {
    if (role === "CREATOR") {
        return await prisma.booking.findMany({
            where: { creator: { userId } },
            include: { client: true },
            orderBy: { createdAt: "desc" }
        });
    } else {
        return await prisma.booking.findMany({
            where: { clientId: userId },
            include: { creator: { include: { user: true } } },
            orderBy: { createdAt: "desc" }
        });
    }
};

/**
 * Update booking status with ownership check
 */
export const updateBookingStatus = async (id, userId, status) => {
    // Verify ownership: must be the client OR the creator's user
    const booking = await prisma.booking.findFirst({
        where: {
            id,
            OR: [
                { clientId: userId },
                { creator: { userId } }
            ]
        }
    });

    if (!booking) {
        throw new Error("Booking not found or you don't have permission to update it");
    }

    const oldStatus = booking.status;
    let updatedBooking;
    try {
        updatedBooking = await prisma.booking.update({
            where: { id },
            data: { status },
            include: {
                client: { select: { id: true } },
                creator: { include: { user: { select: { id: true } } } }
            }
        });

        // Notify relevant party based on status
        if (status === "CONFIRMED") {
            await notifyUser(updatedBooking.client.id, {
                type: "BOOKING",
                title: "Booking Confirmed!",
                message: `Your booking ${updatedBooking.bookingNumber} has been confirmed by the creator.`,
                metadata: { bookingId: updatedBooking.id, type: "BOOKING_CONFIRMED" }
            });
        } else if (status === "CANCELLED") {
            const recipientId = userId === updatedBooking.clientId ?
                updatedBooking.creator.user.id : updatedBooking.clientId;

            await notifyUser(recipientId, {
                type: "BOOKING",
                title: "Booking Cancelled",
                message: `Booking ${updatedBooking.bookingNumber} has been cancelled.`,
                metadata: { bookingId: updatedBooking.id, type: "BOOKING_CANCELLED" }
            });
        }

        return updatedBooking;
    } catch (error) {
        // ROLLBACK: Revert status if notification fails
        if (updatedBooking) {
            await prisma.booking.update({
                where: { id: updatedBooking.id },
                data: { status: oldStatus }
            }).catch(() => { });
        }
        throw error;
    }
};

/**
 * Delete a booking with ownership check
 */
export const deleteBooking = async (id, userId) => {
    // Only allow deletion of PENDING or CANCELLED bookings by the owner
    const booking = await prisma.booking.findFirst({
        where: {
            id,
            clientId: userId,
            status: { in: ["PENDING", "CANCELLED"] }
        }
    });

    if (!booking) {
        throw new Error("Booking not found, not yours, or cannot be deleted in current status");
    }

    return await prisma.booking.delete({
        where: { id }
    });
};

/**
 * Register a check-in for a booking session
 */
export const registerCheckIn = async (bookingId, userId, sessionNumber, location) => {
    // 1. Verify that the user is the creator for this booking
    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
            creator: { userId }
        },
        include: {
            client: { select: { id: true, firstName: true } }
        }
    });

    if (!booking) {
        throw new Error("Booking not found or unauthorized. Only the assigned creator can check-in.");
    }

    // 2. Find the specific session
    const session = await prisma.bookingSession.findFirst({
        where: {
            bookingId,
            sessionNumber
        }
    });

    if (!session) {
        throw new Error(`Session #${sessionNumber} not found for this booking.`);
    }

    // 3. Update the session with check-in data
    const updatedSession = await prisma.bookingSession.update({
        where: { id: session.id },
        data: {
            status: "IN_PROGRESS",
            checkIn: {
                timestamp: new Date(),
                location
            }
        }
    });

    // 4. Update booking status to IN_PROGRESS if it wasn't already
    if (booking.status !== "IN_PROGRESS") {
        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "IN_PROGRESS" }
        });
    }

    // 5. Notify the client
    await notifyUser(booking.client.id, {
        type: "BOOKING",
        title: "Creator Checked In",
        message: `Your creator has checked in for session #${sessionNumber}.`,
        metadata: { bookingId, sessionNumber, type: "CHECK_IN" }
    });

    return updatedSession;
};
