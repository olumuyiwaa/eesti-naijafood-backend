const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
    try {
        const auth = req.headers.authorization || "";
        const [scheme, token] = auth.split(" ");

        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({ message: "Missing or invalid Authorization header" });
        }

        const secret = process.env.ADMIN_JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ message: "Server misconfigured: missing ADMIN_JWT_SECRET" });
        }

        const payload = jwt.verify(token, secret);

        if (!payload || payload.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
        }

        req.admin = payload;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

module.exports = { requireAdmin };