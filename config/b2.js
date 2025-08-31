const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');


const s3 = new S3Client({
region: 'us-west-004', // B2 needs *a* region string; match your endpoint region
endpoint: process.env.B2_ENDPOINT, // e.g. https://s3.us-west-004.backblazeb2.com
credentials: {
accessKeyId: process.env.B2_KEY_ID,
secretAccessKey: process.env.B2_APP_KEY,
},
forcePathStyle: true, // safer across S3-compatible providers
});


const BUCKET = process.env.B2_BUCKET;


async function uploadBuffer(key, buffer, contentType) {
await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }));
return key;
}


async function deleteObject(key) {
await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}


async function getObjectStream(key) {
const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
return { stream: res.Body, contentType: res.ContentType };
}


async function signGetUrl(key, seconds) {
const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: seconds });
return url;
}


module.exports = { uploadBuffer, deleteObject, getObjectStream, signGetUrl };