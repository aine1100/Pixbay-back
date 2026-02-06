import prisma from "../../prisma/client.js";

/**
 * Create a new booking
 */
export const createBooking = async (clientId, bookingData) => {
    const { creatorId, serviceType, category, bookingDetails, pricing } = bookingData;

    // Generate a unique booking number
    const bookingNumber = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return await prisma.booking.create({
        data: {
            bookingNumber,
            clientId,
            creatorId,
            serviceType,
            category,
            bookingDetails,
            pricing,
            status: 'PENDING'
        },
        include: {
            creator: {
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            }
        }
    });
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
    if (role === 'CREATOR') {
        return await prisma.booking.findMany({
            where: { creator: { userId } },
            include: { client: true },
            orderBy: { createdAt: 'desc' }
        });
    } else {
        return await prisma.booking.findMany({
            where: { clientId: userId },
            include: { creator: { include: { user: true } } },
            orderBy: { createdAt: 'desc' }
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

    return await prisma.booking.update({
        where: { id },
        data: { status }
    });
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
            status: { in: ['PENDING', 'CANCELLED'] }
        }
    });

    if (!booking) {
        throw new Error("Booking not found, not yours, or cannot be deleted in current status");
    }

    return await prisma.booking.delete({
        where: { id }
    });
};
