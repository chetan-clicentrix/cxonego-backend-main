module.exports = {
  apps: [

    {
      name: "cxonego-backend",
      script: "build/src/index.js",

      // 1 instance — required for MCP SSE session affinity
      // (MCP sessions are in-memory; cluster mode routes SSE & POST to different instances)
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,

      // Memory tuning
      // Heap: 1.5GB per instance
      node_args: "--max-old-space-size=1536",
      max_memory_restart: "2G",

      // Environment
      env: {
        NODE_ENV: "production"
      },
      env_file: ".env",

      // Logs
      error_file: "logs/backend-error.log",
      out_file: "logs/backend-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",

      // Stability
      max_restarts: 10,
      min_uptime: "15s",
      restart_delay: 4000,
      exp_backoff_restart_delay: 200,
      kill_timeout: 5000,
      listen_timeout: 5000,

      instance_var: "INSTANCE_ID",
      source_map_support: false
    }
  ]
};