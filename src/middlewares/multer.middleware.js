import multer from "multer";

// see the documnetation from multer , gitHub repo

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + "-" + file.originalname);
  },
});


export const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 10 }, // Limit files to 10 MB
});