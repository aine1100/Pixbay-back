import * as jobService from "../../service/job/job.js";

export const postJob = async (req, res) => {
    try {
        const clientId = req.user.id;
        const job = await jobService.createJob(clientId, req.body);
        res.status(201).json({
            success: true,
            data: job
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const listJobs = async (req, res) => {
    try {
        const jobs = await jobService.getAllJobs(req.query);
        res.status(200).json({
            success: true,
            data: jobs
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const getMyJobs = async (req, res) => {
    try {
        const clientId = req.user.id;
        const jobs = await jobService.getClientJobs(clientId);
        res.status(200).json({
            success: true,
            data: jobs
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const getJob = async (req, res) => {
    try {
        const job = await jobService.getJobById(req.params.id);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }
        res.status(200).json({
            success: true,
            data: job
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const updateMyJob = async (req, res) => {
    try {
        const clientId = req.user.id;
        const job = await jobService.updateJob(req.params.id, clientId, req.body);
        res.status(200).json({
            success: true,
            data: job
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteMyJob = async (req, res) => {
    try {
        const clientId = req.user.id;
        await jobService.deleteJob(req.params.id, clientId);
        res.status(200).json({
            success: true,
            message: "Job deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
