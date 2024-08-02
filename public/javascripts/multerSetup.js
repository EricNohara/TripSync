const multer = require("multer");
const multerS3 = require("multer-s3");
const AWS = require("aws-sdk");

AWS.config.update({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const s3 = new AWS.S3();

const uploadS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: function (req, file, cb) {
      cb(null, Date.now().toString());
    },
    contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically sets the correct content type
  }),
});

module.exports = uploadS3;
