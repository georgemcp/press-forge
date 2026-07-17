const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUploadUuid(value: string) {
  return uuidPattern.test(value);
}

export function canonicalUploadPath(userId: string, fileId: string) {
  if (!isUploadUuid(userId) || !isUploadUuid(fileId)) {
    throw new Error("Invalid upload identifier.");
  }
  return `${userId}/reference/${fileId}.png`;
}
