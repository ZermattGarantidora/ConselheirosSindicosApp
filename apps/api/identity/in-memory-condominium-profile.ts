import {
  CondominiumProfilePhotoLimitError,
  maximumCondominiumProfilePhotos
} from "./condominium-profile.js";
import type {
  CondominiumProfile,
  CondominiumProfilePhotoContent,
  CondominiumProfileRepository
} from "./condominium-profile.js";
import type { UserId } from "./authorized-condominium-context.js";

type StoredPhoto = CondominiumProfilePhotoContent;

export function createInMemoryCondominiumProfileRepository(
  initialProfiles: readonly CondominiumProfile[],
  resolveMissingProfile?: (userId: UserId, condominiumId: string) => CondominiumProfile | undefined
): CondominiumProfileRepository {
  const profiles = new Map(initialProfiles.map((profile) => [profile.condominiumId, profile]));
  const photos = new Map<string, StoredPhoto[]>();
  const getOrResolve = (userId: UserId, condominiumId: string): CondominiumProfile | undefined => {
    const existing = profiles.get(condominiumId);
    if (existing !== undefined) return existing;
    const resolved = resolveMissingProfile?.(userId, condominiumId);
    if (resolved !== undefined) profiles.set(condominiumId, resolved);
    return resolved;
  };

  return {
    async deleteCondominium(condominiumId) {
      profiles.delete(condominiumId);
      photos.delete(condominiumId);
    },

    async getProfile({ userId, condominiumId }) {
      return getOrResolve(userId, condominiumId);
    },

    async updateProfile({ userId, condominiumId, profile }) {
      const current = getOrResolve(userId, condominiumId);
      if (current === undefined) return undefined;
      const updated = Object.freeze({ ...profile, condominiumId, cnpj: current.cnpj });
      profiles.set(condominiumId, updated);
      return updated;
    },

    async listPhotos({ condominiumId }) {
      return Object.freeze(
        (photos.get(condominiumId) ?? []).map((photo) =>
          Object.freeze({
            photoId: photo.photoId,
            mediaType: photo.mediaType,
            sizeBytes: photo.sizeBytes,
            isCover: photo.isCover,
            createdAt: photo.createdAt
          })
        )
      );
    },

    async addPhoto({ condominiumId, photoId, mediaType, content }) {
      const current = photos.get(condominiumId) ?? [];
      if (current.length >= maximumCondominiumProfilePhotos)
        throw new CondominiumProfilePhotoLimitError();
      const photo = Object.freeze({
        photoId,
        mediaType,
        sizeBytes: content.length,
        isCover: current.length === 0,
        createdAt: new Date().toISOString(),
        content: Buffer.from(content)
      });
      current.push(photo);
      photos.set(condominiumId, current);
      return Object.freeze({
        photoId: photo.photoId,
        mediaType: photo.mediaType,
        sizeBytes: photo.sizeBytes,
        isCover: photo.isCover,
        createdAt: photo.createdAt
      });
    },

    async readPhoto({ condominiumId, photoId }) {
      const photo = photos.get(condominiumId)?.find((item) => item.photoId === photoId);
      return photo === undefined
        ? undefined
        : Object.freeze({ ...photo, content: Buffer.from(photo.content) });
    },

    async setCover({ condominiumId, photoId }) {
      const items = photos.get(condominiumId) ?? [];
      if (!items.some((photo) => photo.photoId === photoId))
        throw new Error("Foto não encontrada.");
      photos.set(
        condominiumId,
        items.map((photo) => Object.freeze({ ...photo, isCover: photo.photoId === photoId }))
      );
    },

    async deletePhoto({ condominiumId, photoId }) {
      const items = photos.get(condominiumId) ?? [];
      const removed = items.find((photo) => photo.photoId === photoId);
      if (removed === undefined) throw new Error("Foto não encontrada.");
      const remaining = items.filter((photo) => photo.photoId !== photoId);
      if (removed.isCover && remaining[0] !== undefined) {
        remaining[0] = Object.freeze({ ...remaining[0], isCover: true });
      }
      photos.set(condominiumId, remaining);
    }
  };
}
