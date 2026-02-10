module.exports = {
  apps: [
    /* =========================
       FRONTEND (React / Vite)
       ========================= */
    {
      name: "cxonego-frontend",
      script: "server.cjs",

      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,

      // Memory tuning
      // Heap: 2GB | Restart if real leak
      node_args: "--max-old-space-size=2048",
      max_memory_restart: "2200M",

      // Environment
      env: {
        NODE_ENV: "production",
        PORT: 5173
      },

      // Logs
      error_file: "logs/frontend-error.log",
      out_file: "logs/frontend-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",

      // Stability
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 3000,
      wait_ready: true,
      listen_timeout: 10000,

      source_map_support: false
    },

    /* =========================
       BACKEND (Node API)
       ========================= */
    {
      name: "cxonego-backend-main",
      script: "build/src/index.js",

      // 2 vCPU → 2 instances
      instances: 2,
      exec_mode: "cluster",
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