const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
  windowMS: 60 * 1000, // 1 min
  max: 120, // TODO: figure out what this number should be.
  message: "Too many requests. Please try again in 1 min.",
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
});

const globablRateLimit = rateLimit({
  windowMS: 60 * 1000, // 1 min
  max: 12000,
  message: "Too many requests. Please try again in 1 min.",
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: () => 'global'
})

module.exports = { rateLimiter, globablRateLimit };
