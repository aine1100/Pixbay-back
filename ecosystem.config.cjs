module.exports = {
    apps: [
        {
            name: "pixbay-api",
            script: "./server.js",
            instances: "max", // Utilize all CPU cores
            exec_mode: "cluster",
            autorestart: true,
            watch: false,
            max_memory_restart: "4G",
            env: {
                NODE_ENV: "development",
            },
            env_production: {
                NODE_ENV: "production",
            },
        },
        {
            name: "pixbay-worker",
            script: "./workers/worker.js",
            watch: false,
            autorestart: true,
            max_memory_restart: "500M",
            env: {
                NODE_ENV: "development",
            },
            env_production: {
                NODE_ENV: "production",
            },
        },
    ],
};
