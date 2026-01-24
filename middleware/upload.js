const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Menu folder storage
const menuStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "menu",
        allowed_formats: ["jpg", "png", "jpeg"],
    },
});

// Site details folder storage
const siteDetailsStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "siteDetails",
        allowed_formats: ["jpg", "png", "jpeg"],
    },
});

const uploadMenu = multer({ storage: menuStorage });
const uploadSiteDetails = multer({ storage: siteDetailsStorage });

// Default export for backward compatibility
module.exports = uploadMenu;

// Named exports
module.exports.menu = uploadMenu;
module.exports.siteDetails = uploadSiteDetails;