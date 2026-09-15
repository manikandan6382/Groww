import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "../db/connection.js";

const attachmentTypes = new Set(["ENTRY_SCREENSHOT", "EXIT_SCREENSHOT", "SETUP_IMAGE"]);
const imageExtensions = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function insertAttachments(db, tradeId, attachments) {
  attachments.forEach((attachment, index) => {
    if (!attachment?.dataUrl || !attachmentTypes.has(attachment.type)) return;
    const saved = saveAttachmentFile(tradeId, attachment, index);
    if (!saved) return;
    db.prepare(`
      INSERT INTO trade_attachments(trade_id, attachment_type, file_path, original_name, caption)
      VALUES (?, ?, ?, ?, ?)
    `).run(tradeId, attachment.type, saved.publicPath, attachment.name || "", attachment.caption || "");
  });
}

export function saveAttachmentFile(tradeId, attachment, index) {
  const match = String(attachment.dataUrl).match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const data = Buffer.from(match[2], "base64");
  if (data.length > 4 * 1024 * 1024) return null;

  const root = getProjectRoot();
  const uploadDir = path.join(root, "data", "uploads", "trades");
  fs.mkdirSync(uploadDir, { recursive: true });
  const safeType = attachment.type.toLowerCase().replace(/[^a-z_]/g, "");
  const fileName = `${tradeId}-${safeType}-${Date.now()}-${index}.${imageExtensions[mimeType]}`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, data);
  return {
    filePath,
    publicPath: `/evidence/trades/${fileName}`,
  };
}
