import prisma from "../../prisma/client.js";
import { sendEmail } from "../../utils/email.js";
import { notifyUser } from "../notification/notification.js";

/**
 * Create a new support ticket and notify admin
 */
export const createTicket = async (ticketData) => {
    const { userId, name, email, subject, message, priority } = ticketData;

    const ticket = await prisma.supportTicket.create({
        data: {
            userId: userId || null,
            name: name || null,
            email: email || null,
            subject,
            message,
            priority: priority || "NORMAL"
        },
        include: {
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });

    // Notify Admin via Email (Sent Directly)
    const adminEmail = process.env.EMAIL_USER;
    const senderName = ticket.user ? `${ticket.user.firstName} ${ticket.user.lastName}` : ticket.name || "Guest";
    const senderEmail = ticket.user ? ticket.user.email : ticket.email;

    const emailSubject = `[Support Ticket] ${subject} - ${priority}`;
    const emailHtml = `
        <h2>New Support Ticket Received</h2>
        <p><strong>From:</strong> ${senderName} (${senderEmail})</p>
        <p><strong>Priority:</strong> ${priority}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br/>")}</p>
        <hr />
        <p>You can view and manage this ticket in the admin dashboard.</p>
    `;

    try {
        await sendEmail(adminEmail, emailSubject, emailHtml);
    } catch (error) {
        console.error("[Support Service] Failed to send admin notification email:", error.message);
    }

    // Create an in-app notification for the user (if logged in)
    if (userId) {
        try {
            await notifyUser(userId, {
                type: "SYSTEM",
                title: "Support Ticket Submitted",
                message: `Your support ticket "${subject}" has been received. Our team will get back to you soon.`,
                metadata: { ticketId: ticket.id, subject }
            });
        } catch (error) {
            console.error("[Support Service] Failed to create in-app notification:", error.message);
        }
    }

    return ticket;
};

/**
 * Get all tickets (Admin only)
 */
export const getAllTickets = async (filters = {}) => {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, search } = filters;

    const where = {
        ...(status && { status }),
        ...(search && {
            OR: [
                { subject: { contains: search, mode: "insensitive" } },
                { message: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } }
            ]
        })
    };

    const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        }),
        prisma.supportTicket.count({ where })
    ]);

    return { tickets, total, page, limit };
};

/**
 * Update ticket status
 */
export const updateTicketStatus = async (ticketId, status) => {
    const ticket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status }
    });
    return ticket;
};

/**
 * Get tickets for a specific user
 */
export const getUserTickets = async (userId) => {
    return await prisma.supportTicket.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
    });
};
