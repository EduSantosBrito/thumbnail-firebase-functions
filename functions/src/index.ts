import admin from "firebase-admin";
import { storage } from "firebase-functions";
import path from "path";
import { spawn } from "child-process-promise";
import fs from "fs";
import os from "os";

admin.initializeApp();

export const generateThumbnail = storage
  .object()
  .onFinalize(async (object: storage.ObjectMetadata) => {
    const fileBucket = object.bucket;
    const filePath = object.name;
    const contentType = object.contentType;

    if (!contentType?.startsWith("image/")) {
      return console.log("This is not an image");
    }

    if (!filePath) {
      return console.log(`ERROR: filePath is ${filePath}`);
    }

    const fileName = path.basename(filePath);

    if (fileName.startsWith("thumb_")) {
      return console.log("Already a Thumbnail.");
    }

    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const metadata = {
      contentType: contentType,
    };
    await bucket.file(filePath).download({ destination: tempFilePath });
    console.log("Image downloaded locally to", tempFilePath);

    await spawn("convert", [
      tempFilePath,
      "-thumbnail",
      "200x200>",
      tempFilePath,
    ]);
    console.log("Thumbnail created at", tempFilePath);
    const thumbFileName = `thumb_${fileName}`;
    const thumbFilePath = path.join(path.dirname(filePath), thumbFileName);
    await bucket.upload(tempFilePath, {
      destination: thumbFilePath,
      metadata: metadata,
    });
    return fs.unlinkSync(tempFilePath);
  });
