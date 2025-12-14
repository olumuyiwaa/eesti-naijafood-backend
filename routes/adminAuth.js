const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { requireAdmin } = require("../middleware/adminAuth");

const router = express.Router();

/**
 * POST /api/admin/login
 * Body: { username, password }
 * Returns: { token }
 */
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({ message: "username and password are required" });
        }

        const jwtSecret = process.env.JWT_SECRET;
        const expiresIn = process.env.JWT_EXPIRES_IN || "12h";
        if (!jwtSecret) {
            return res.status(500).json({ message: "Server misconfigured: missing ADMIN_JWT_SECRET" });
        }

        const admin = await Admin.findOne({ username }).lean();
        if (!admin) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const ok = await bcrypt.compare(password, admin.passwordHash);
        if (!ok) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { role: "admin", adminId: String(admin._id), username: admin.username },
            jwtSecret,
            { expiresIn }
        );

        return res.json({ token });
    } catch (err) {
        return res.status(500).json({ message: "Login failed" });
    }
});

/**
 * POST /api/admin/change-password
 * Header: Authorization: Bearer <token>
 * Body: { currentPassword, newPassword }
 */
router.post("/change-password", requireAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "currentPassword and newPassword are required" });
        }

        if (typeof newPassword !== "string" || newPassword.length < 10) {
            return res.status(400).json({ message: "newPassword must be at least 10 characters" });
        }

        const adminId = req.admin?.adminId;
        if (!adminId) {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(401).json({ message: "Admin not found" });
        }

        const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
        if (!ok) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        admin.passwordHash = await bcrypt.hash(newPassword, 12);
        await admin.save();

        // Optional: recommend re-login by expiring token on client side.
        return res.json({ message: "Password updated" });
    } catch (err) {
        return res.status(500).json({ message: "Could not update password" });
    }
});

module.exports = router;