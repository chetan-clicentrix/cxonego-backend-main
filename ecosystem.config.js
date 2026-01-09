module.exports = {
  apps: [
    {
      // Application name
      name: "cxonego-backend-main",
      
      // Script to run (compiled JavaScript from TypeScript build)
      script: "build/src/index.js",
      
      // Cluster mode - use all available CPU cores for better performance
      instances: "max", // or specify a number like 2, 4, etc.
      exec_mode: "cluster",
      
      // Auto-restart configuration
      autorestart: true,
      watch: false, // Don't watch files in production
      
      // Memory management
      max_memory_restart: "1G", // Restart if memory exceeds 1GB
      
      // Graceful shutdown
      kill_timeout: 5000, // Wait 5 seconds before force killing
      listen_timeout: 3000, // Wait 3 seconds for app to be ready
      
      // Error handling
      max_restarts: 10, // Max restarts within min_uptime
      min_uptime: "10s", // Min uptime before considering app stable
      
      // Logging configuration
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      log_file: "logs/combined.log",
      time: true, // Prefix logs with timestamp
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      
      // Log rotation (requires pm2-logrotate module)
      // Install with: pm2 install pm2-logrotate
      merge_logs: true,
      
      // Environment variables
      env: {
        NODE_ENV: "production",
      },
      env_production: {
        NODE_ENV: "production",
      },
      
      // Load .env file
      env_file: ".env",
      
      // Advanced PM2 features
      instance_var: "INSTANCE_ID", // Environment variable with instance id
      
      // Restart delay
      restart_delay: 4000, // Wait 4 seconds before restart
      
      // Exponential backoff restart delay
      exp_backoff_restart_delay: 100,
      
      // Source map support for better error traces
      source_map_support: true,
      
      // Disable auto-dump on exit
      autorestart: true,
      
      // Cron restart (optional - restart every day at 3 AM)
      // cron_restart: "0 3 * * *",
      
      // Post-deploy hooks (optional)
      // post_update: ["npm install", "echo Deployment finished"],
    }
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: "root",
      host: process.env.DEPLOY_HOST || "your-server-ip",
      ref: "origin/production",
      repo: process.env.REPO_URL || "git@github.com:your-repo.git",
      path: "/root/cxonego/cxonego-backend-main",
      "post-deploy": "npm install && npm run build && pm2 reload ecosystem.config.js --env production"
    }
  }
};