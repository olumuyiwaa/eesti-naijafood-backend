const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true, trim: true },
        passwordHash: { type: String, required: true },
    },
    { timestamps: true }
);

adminSchema.index({ username: 1 }, { unique: true });

module.exports = mongoose.model("Admin", adminSchema);