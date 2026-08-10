/** PM2 process file — run on Linux VPS: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "lms",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      // Large admin video uploads (~1 GB) need headroom; 1G caused PM2 restarts → nginx 502.
      max_memory_restart: "3G",
    },
  ],
};
