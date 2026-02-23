import * as adminService from "../../service/admin/admin.js";
import * as supportService from "../../service/support/support.js";

/**
 * Get all users with filters
 */
export const getAllUsers = async (req, res) => {
    try {
        const result = await adminService.getAllUsers(req.query);
        res.status(200).json({
            success: true,
            count: result.total,
            data: result.users,
            page: result.page,
            limit: result.limit
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get all creators with filters (status, type)
 */
export const getCreators = async (req, res) => {
    try {
        const result = await adminService.getCreators(req.query);
        res.status(200).json({
            success: true,
            count: result.total,
            data: result.creators,
            page: result.page,
            limit: result.limit
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Approve or Reject a creator verification request
 */
export const approveCreator = async (req, res) => {
    try {
        const { creatorId } = req.params;
        const result = await adminService.verifyCreator(creatorId, req.body);
        res.status(200).json({
            success: true,
            message: `Creator ${req.body.status} successfully`,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update a user (Admin only)
 */
export const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await adminService.updateUser(userId, req.body);
        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Resolve a dispute (Admin only)
 */
export const resolveDispute = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const result = await adminService.resolveDispute(disputeId, req.user.id, req.body);
        res.status(200).json({
            success: true,
            message: "Dispute resolved successfully",
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * List disputes (Admin only)
 */
export const listDisputes = async (req, res) => {
    try {
        const result = await adminService.listDisputes(req.query);
        res.status(200).json({
            success: true,
            count: result.total,
            data: result.disputes,
            page: result.page,
            limit: result.limit
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * List transactions (Admin only)
 */
export const listTransactions = async (req, res) => {
    try {
        const result = await adminService.listTransactions(req.query);
        res.status(200).json({
            success: true,
            count: result.total,
            data: result.transactions,
            page: result.page,
            limit: result.limit
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * List jobs (Admin only)
 */
export const listJobs = async (req, res) => {
    try {
        const result = await adminService.listJobs(req.query);
        res.status(200).json({
            success: true,
            count: result.total,
            data: result.jobs,
            page: result.page,
            limit: result.limit
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * List categories (Admin only)
 */
export const listCategories = async (req, res) => {
    try {
        const result = await adminService.listCategories(req.query);
        res.status(200).json({
            success: true,
            count: result.total,
            data: result.categories,
            page: result.page,
            limit: result.limit
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update job status (Admin only)
 */
export const updateJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const result = await adminService.updateJobStatus(jobId, req.body);
        res.status(200).json({
            success: true,
            message: "Job updated successfully",
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * List support tickets (Admin only)
 */
export const listSupportTickets = async (req, res) => {
    try {
        const result = await supportService.getAllTickets(req.query);
        res.status(200).json({
            success: true,
            count: result.total,
            data: result.tickets,
            page: result.page,
            limit: result.limit
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update support ticket status (Admin only)
 */
export const updateSupportTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }
        const updated = await supportService.updateTicketStatus(ticketId, status);
        res.status(200).json({
            success: true,
            data: updated,
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
 * Get platform summary statistics (Admin only)
 */
export const getSummary = async (req, res) => {
    try {
        const summary = await adminService.getPlatformSummary(req.query);
        res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const toCsv = (rows, columns) => {
    const escape = (val) => {
        if (val === null || val === undefined) return "";
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };
    const header = columns.map((c) => escape(c.label)).join(",");
    const lines = rows.map((row) =>
        columns
            .map((c) => {
                const value = typeof c.value === "function" ? c.value(row) : row[c.value];
                return escape(value);
            })
            .join(",")
    );
    return [header, ...lines].join("\n");
};

/**
 * Export CSV (Admin only)
 */
export const exportCsv = async (req, res) => {
    try {
        const { resource } = req.params;
        let rows = [];
        let filename = `${resource}.csv`;
        let columns = [];

        if (resource === "users") {
            rows = await adminService.exportUsers(req.query);
            columns = [
                { label: "ID", value: "id" },
                { label: "Email", value: "email" },
                { label: "First Name", value: "firstName" },
                { label: "Last Name", value: "lastName" },
                { label: "Role", value: "role" },
                { label: "Active", value: "isActive" },
                { label: "Verified", value: "isVerified" },
                { label: "Created At", value: "createdAt" },
                { label: "Last Login", value: "lastLoginAt" }
            ];
        } else if (resource === "creators") {
            rows = await adminService.exportCreators(req.query);
            columns = [
                { label: "ID", value: "id" },
                { label: "User ID", value: "userId" },
                { label: "Email", value: (r) => r.user?.email },
                { label: "Name", value: (r) => `${r.user?.firstName || ""} ${r.user?.lastName || ""}`.trim() },
                { label: "Status", value: "verificationStatus" },
                { label: "Verified", value: "isVerified" },
                { label: "Created At", value: "createdAt" }
            ];
        } else if (resource === "disputes") {
            rows = await adminService.exportDisputes(req.query);
            columns = [
                { label: "ID", value: "id" },
                { label: "Number", value: "disputeNumber" },
                { label: "Type", value: "type" },
                { label: "Status", value: "status" },
                { label: "Booking", value: (r) => r.booking?.bookingNumber },
                { label: "Raised By", value: (r) => `${r.raiser?.firstName || ""} ${r.raiser?.lastName || ""}`.trim() },
                { label: "Created At", value: "createdAt" }
            ];
        } else if (resource === "transactions") {
            rows = await adminService.exportTransactions(req.query);
            columns = [
                { label: "ID", value: "id" },
                { label: "Number", value: "transactionNumber" },
                { label: "Type", value: "type" },
                { label: "Status", value: "status" },
                { label: "Amount", value: "amount" },
                { label: "Currency", value: "currency" },
                { label: "User", value: (r) => `${r.user?.firstName || ""} ${r.user?.lastName || ""}`.trim() },
                { label: "Booking", value: (r) => r.booking?.bookingNumber },
                { label: "Created At", value: "createdAt" }
            ];
        } else if (resource === "jobs") {
            rows = await adminService.exportJobs(req.query);
            columns = [
                { label: "ID", value: "id" },
                { label: "Title", value: "title" },
                { label: "Status", value: "status" },
                { label: "Client", value: (r) => `${r.client?.firstName || ""} ${r.client?.lastName || ""}`.trim() },
                { label: "Category", value: (r) => r.category?.name },
                { label: "Created At", value: "createdAt" }
            ];
        } else if (resource === "support") {
            rows = await adminService.exportSupportTickets(req.query);
            columns = [
                { label: "ID", value: "id" },
                { label: "Subject", value: "subject" },
                { label: "Status", value: "status" },
                { label: "Priority", value: "priority" },
                { label: "User", value: (r) => r.user?.email || r.email },
                { label: "Created At", value: "createdAt" }
            ];
        } else if (resource === "categories") {
            rows = await adminService.exportCategories(req.query);
            columns = [
                { label: "ID", value: "id" },
                { label: "Name", value: "name" },
                { label: "Slug", value: "slug" },
                { label: "Type", value: "type" },
                { label: "Active", value: "isActive" },
                { label: "Created At", value: "createdAt" }
            ];
        } else {
            return res.status(400).json({ success: false, message: "Invalid export resource" });
        }

        const csv = toCsv(rows, columns);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
