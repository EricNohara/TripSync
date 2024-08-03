const multer = require("multer");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const sharp = require("sharp");
const stream = require("stream");
const crypto = require("crypto");
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

function calculateSHA256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function uploadToS3(req, res, next) {
  try {
    if (!req.file) throw new CustomErr("No file uploaded");

    const processedImage = await sharp(req.file.buffer)
      .webp({ quality: imageQuality })
      .withMetadata({})
      .toBuffer();

    const newImageHash = calculateSHA256(processedImage);

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
    req.file.hash = newImageHash;
    next();
  } catch (err) {
    next(err);
  }
}

async function deleteFromS3(imageURL) {
  try {
    const splitURL = imageURL.split("/");
    const key = splitURL[splitURL.length - 1];

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      })
    );
  } catch (err) {
    throw new CustomErr(err);
  }
}

module.exports = { uploadToS3, upload, deleteFromS3, calculateSHA256 };
