import * as dashboardService from "../../service/dashboard/dashboard.js";

/**
 * Get dashboard stats based on user role
 */
export const getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { month, year } = req.query;

        let stats = {};
        if (role === "CREATOR") {
            stats = await dashboardService.getCreatorStats(userId);
        } else {
            stats = await dashboardService.getClientStats(userId);
        }

        // Always get calendar events if month/year provided, or default to current
        const now = new Date();
        const m = parseInt(month) || now.getMonth() + 1;
        const y = parseInt(year) || now.getFullYear();

        const events = await dashboardService.getCalendarEvents(userId, role, m, y);
        const transactions = await dashboardService.getRecentTransactions(userId, role);
        const bookings = await dashboardService.getRecentBookings(userId, role);

        res.status(200).json({
            success: true,
            data: {
                stats,
                events,
                transactions,
                bookings
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
