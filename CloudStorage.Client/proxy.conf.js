const PROXY_CONFIG = {
  "/api": {
    "target": process.env.PROXY_TARGET || "http://localhost:5000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  },
  "/hubs": {
    "target": process.env.PROXY_TARGET || "http://localhost:5000",
    "secure": false,
    "ws": true,
    "changeOrigin": true,
    "logLevel": "debug"
  }
};

module.exports = PROXY_CONFIG;
