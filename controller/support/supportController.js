import * as supportService from "../../service/support/support.js";

/**
 * Controller to submit a support ticket
 */
export const submitTicket = async (req, res) => {
    try {
        const ticketData = {
            ...req.body,
            userId: req.user ? req.user.id : null
        };

        if (!ticketData.subject || !ticketData.message) {
            return res.status(400).json({
                success: false,
                message: "Subject and message are required"
            });
        }

        const ticket = await supportService.createTicket(ticketData);
        res.status(201).json({
            success: true,
            data: ticket,
            message: "Support ticket submitted successfully. Our team will get back to you soon."
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to list all tickets (Admin only)
 */
export const listTickets = async (req, res) => {
    try {
        const result = await supportService.getAllTickets(req.query);
        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to update ticket status (Admin only)
 */
export const updateStatus = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }
        const updatedTicket = await supportService.updateTicketStatus(ticketId, status);
        res.status(200).json({
            success: true,
            data: updatedTicket,
            message: "Ticket status updated successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to get user's own tickets
 */
export const getMyTickets = async (req, res) => {
    try {
        const tickets = await supportService.getUserTickets(req.user.id);
        res.status(200).json({
            success: true,
            data: tickets
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
