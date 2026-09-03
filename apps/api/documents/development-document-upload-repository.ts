import type { DocumentUploadRepository } from "./upload-document.js";

export function createDevelopmentDocumentUploadRepository(): DocumentUploadRepository {
  return {
    async recordUploaded() {}
  };
}
