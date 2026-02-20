import * as bidService from "../../service/job/bidService.js";

export const submitBid = async (req, res) => {
    try {
        const creatorId = req.user.id;
        const { jobId } = req.params;
        const bid = await bidService.createBid(creatorId, jobId, req.body);
        res.status(201).json({ success: true, data: bid });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getJobBids = async (req, res) => {
    try {
        const bids = await bidService.getBidsForJob(req.params.jobId);
        res.status(200).json({ success: true, data: bids });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getMyBids = async (req, res) => {
    try {
        const bids = await bidService.getMyBids(req.user.id);
        res.status(200).json({ success: true, data: bids });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateBid = async (req, res) => {
    try {
        const bid = await bidService.updateBid(req.params.id, req.user.id, req.body);
        res.status(200).json({ success: true, data: bid });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const withdrawBid = async (req, res) => {
    try {
        const bid = await bidService.withdrawBid(req.params.id, req.user.id);
        res.status(200).json({ success: true, data: bid, message: "Bid withdrawn" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const acceptBid = async (req, res) => {
    try {
        const bid = await bidService.acceptBid(req.params.id, req.user.id);
        res.status(200).json({ success: true, data: bid, message: "Bid accepted" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const rejectBid = async (req, res) => {
    try {
        const bid = await bidService.rejectBid(req.params.id, req.user.id);
        res.status(200).json({ success: true, data: bid, message: "Bid rejected" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
