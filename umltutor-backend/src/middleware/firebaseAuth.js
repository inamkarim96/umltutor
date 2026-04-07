"use strict";

const RouteMiddleware = require('./routeMiddleware');

/**
 * Middleware to authenticate requests using Firebase
 * This redirects to the unified RouteMiddleware.authenticate implementation
 */
const authenticateFirebase = RouteMiddleware.authenticate;

module.exports = { authenticateFirebase };
