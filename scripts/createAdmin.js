const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

async function seedAdmin() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("Missing MONGO_URI");

    const username = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        throw new Error("Missing ADMIN_USERNAME or ADMIN_PASSWORD");
    }

    await mongoose.connect(mongoUri);

    // 🔒 HARD GUARD: do not allow more than one admin
    const adminCount = await Admin.countDocuments();

    if (adminCount > 0) {
        console.log("🚫 Admin already exists. Seeding aborted.");
        await mongoose.disconnect();
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await Admin.create({
        username,
        passwordHash,
    });

    console.log("✅ Admin seeded successfully");
    await mongoose.disconnect();
}

seedAdmin().catch((e) => {
    console.error("❌ Seed failed:", e.message);
    process.exit(1);
});
