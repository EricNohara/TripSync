const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const sharp = require("sharp");
const stream = require("stream");
const { CustomErr } = require("./customErrors");
const imageQuality = 10;

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

async function uploadToS3(req, res, next) {
  try {
    if (!req.file) throw new CustomErr("No file uploaded");

    const processedImage = await sharp(req.file.buffer)
      .webp({ quality: imageQuality })
      .toBuffer();

    const readableStream = new stream.PassThrough();
    readableStream.end(processedImage);

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${Date.now()}.webp`,
      Body: readableStream,
      ContentType: "image/webp",
    };

    const parallelUploads3 = new Upload({
      client: s3Client,
      params: params,
      leavePartsOnError: false,
    });

    await parallelUploads3.done();
    const location = `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
    req.file.location = location;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadToS3, upload };
