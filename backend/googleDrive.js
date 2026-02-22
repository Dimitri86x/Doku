import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";

function getAuthClient() {
  if (!DRIVE_FOLDER_ID || !SERVICE_ACCOUNT_PATH) {
    return null;
  }

  const absolutePath = path.resolve(process.cwd(), SERVICE_ACCOUNT_PATH);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return new google.auth.GoogleAuth({
    keyFile: absolutePath,
    scopes: ["https://www.googleapis.com/auth/drive.file"]
  });
}

export async function uploadProtocolJson(record) {
  const auth = getAuthClient();
  if (!auth) {
    return { uploaded: false, reason: "Google Drive nicht konfiguriert" };
  }

  const drive = google.drive({ version: "v3", auth });
  const fileName = [
    record.module_type,
    record.kunde || "kunde",
    record.projekt || "projekt",
    record.id
  ]
    .join("_")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .toLowerCase();

  const file = await drive.files.create({
    requestBody: {
      name: `${fileName}.json`,
      parents: [DRIVE_FOLDER_ID],
      mimeType: "application/json"
    },
    media: {
      mimeType: "application/json",
      body: record.payload_json
    },
    fields: "id,webViewLink"
  });

  return {
    uploaded: true,
    fileId: file.data.id,
    webViewLink: file.data.webViewLink
  };
}
