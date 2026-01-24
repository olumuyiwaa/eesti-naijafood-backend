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

module.exports = {
    default: multer({ storage: menuStorage }),
    menu: multer({ storage: menuStorage }),
    siteDetails: multer({ storage: siteDetailsStorage }),
};

// For backward compatibility with existing code
module.exports.default = multer({ storage: menuStorage });