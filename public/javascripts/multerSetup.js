const multer = require("multer");
const {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
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

async function uploadToS3(req, res) {
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
  } catch (err) {
    if (err instanceof CustomErr) throw err;
    else throw new CustomErr(err);
  }
}

async function uploadToS3Middleware(req, res, next) {
  try {
    await uploadToS3(req, res);
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

async function downloadFromS3(res, params) {
  try {
    const command = new GetObjectCommand(params);
    const { Body } = await s3Client.send(command);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${params.Key}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");
    Body.pipe(res); // Streams the file to the response
  } catch (err) {
    throw new CustomErr("Cannot download file at this time");
  }
}

module.exports = {
  uploadToS3,
  uploadToS3Middleware,
  upload,
  deleteFromS3,
  calculateSHA256,
  downloadFromS3,
};
