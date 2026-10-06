import { describe, expect, it, vi } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import {
  CondominiumProfilePhotoLimitError,
  type CondominiumProfileUpdate
} from "../../apps/api/identity/condominium-profile.js";
import { createInMemoryCondominiumProfileRepository } from "../../apps/api/identity/in-memory-condominium-profile.js";

const userId = createUserId("gestor-sintetico");
const condominiumId = createCondominiumId("condominio-sintetico");
const otherCondominiumId = createCondominiumId("outro-condominio");
const profile = {
  condominiumId,
  name: "Residencial Horizonte",
  cnpj: "12345678000199",
  address: {
    postalCode: "01234567",
    street: "Rua A",
    number: "1",
    complement: "",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP"
  },
  administrationCompany: "Administração",
  unitCount: 12,
  contact: { managerName: "Maria", email: "maria@example.test", phone: "11999999999" },
  description: "Perfil inicial"
} as const;

function profileUpdate(name = "Residencial Atualizado"): CondominiumProfileUpdate {
  return {
    name,
    address: { ...profile.address, city: "Campinas" },
    administrationCompany: profile.administrationCompany,
    unitCount: profile.unitCount,
    contact: profile.contact,
    description: profile.description
  };
}

function photoId(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

describe("repositório de perfil de condomínio em memória", () => {
  it("lê perfis iniciais, resolve perfil ausente uma vez e retorna ausência quando não há resolução", async () => {
    const resolved = { ...profile, condominiumId: otherCondominiumId, name: "Resolvido" };
    const resolveMissingProfile = vi.fn(
      (requestedUserId: typeof userId, requestedCondominiumId: string) =>
        requestedUserId === userId && requestedCondominiumId === otherCondominiumId
          ? resolved
          : undefined
    );
    const repository = createInMemoryCondominiumProfileRepository([profile], resolveMissingProfile);

    await expect(repository.getProfile({ userId, condominiumId })).resolves.toEqual(profile);
    await expect(
      repository.getProfile({ userId, condominiumId: otherCondominiumId })
    ).resolves.toEqual(resolved);
    await expect(
      repository.getProfile({ userId, condominiumId: otherCondominiumId })
    ).resolves.toEqual(resolved);
    await expect(
      repository.getProfile({ userId, condominiumId: createCondominiumId("ausente") })
    ).resolves.toBeUndefined();
    expect(resolveMissingProfile).toHaveBeenCalledTimes(2);
  });

  it("atualiza apenas um perfil existente e preserva CNPJ e identificador", async () => {
    const repository = createInMemoryCondominiumProfileRepository([profile]);
    const update = profileUpdate();
    const saved = await repository.updateProfile({
      userId,
      condominiumId,
      profile: update
    });

    expect(saved).toMatchObject({
      condominiumId,
      cnpj: profile.cnpj,
      name: "Residencial Atualizado"
    });
    await expect(
      repository.updateProfile({ userId, condominiumId: otherCondominiumId, profile: saved! })
    ).resolves.toBeUndefined();
  });

  it("adiciona, lista e lê fotos sem expor o conteúdo na lista", async () => {
    const repository = createInMemoryCondominiumProfileRepository([profile]);
    const content = Buffer.from([0xff, 0xd8, 0xff]);
    const added = await repository.addPhoto({
      userId,
      condominiumId,
      photoId: photoId(1),
      mediaType: "image/jpeg",
      content
    });

    expect(added).toMatchObject({ photoId: photoId(1), sizeBytes: 3, isCover: true });
    await expect(repository.listPhotos({ userId, condominiumId })).resolves.toEqual([added]);
    const read = await repository.readPhoto({ userId, condominiumId, photoId: photoId(1) });
    expect(read?.content).toEqual(content);
    expect(read?.content).not.toBe(content);
    await expect(
      repository.readPhoto({ userId, condominiumId, photoId: photoId(2) })
    ).resolves.toBeUndefined();
  });

  it("impõe o limite de cinco fotos e permite trocar a capa", async () => {
    const repository = createInMemoryCondominiumProfileRepository([profile]);
    for (let index = 1; index <= 5; index += 1) {
      await repository.addPhoto({
        userId,
        condominiumId,
        photoId: photoId(index),
        mediaType: "image/png",
        content: Buffer.from([index])
      });
    }
    await expect(
      repository.addPhoto({
        userId,
        condominiumId,
        photoId: photoId(6),
        mediaType: "image/png",
        content: Buffer.from([6])
      })
    ).rejects.toBeInstanceOf(CondominiumProfilePhotoLimitError);

    await repository.setCover({ userId, condominiumId, photoId: photoId(4) });
    await expect(repository.listPhotos({ userId, condominiumId })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ photoId: photoId(4), isCover: true })])
    );
    await expect(
      repository.setCover({ userId, condominiumId, photoId: photoId(7) })
    ).rejects.toThrow("Foto não encontrada.");
  });

  it("remove fotos, promove a próxima capa e remove todo o condomínio", async () => {
    const repository = createInMemoryCondominiumProfileRepository([profile]);
    for (let index = 1; index <= 2; index += 1) {
      await repository.addPhoto({
        userId,
        condominiumId,
        photoId: photoId(index),
        mediaType: "image/webp",
        content: Buffer.from([index])
      });
    }
    await repository.deletePhoto({ userId, condominiumId, photoId: photoId(1) });
    await expect(repository.listPhotos({ userId, condominiumId })).resolves.toEqual([
      expect.objectContaining({ photoId: photoId(2), isCover: true })
    ]);
    await expect(
      repository.deletePhoto({ userId, condominiumId, photoId: photoId(1) })
    ).rejects.toThrow("Foto não encontrada.");

    await repository.deleteCondominium!(condominiumId);
    await expect(repository.getProfile({ userId, condominiumId })).resolves.toBeUndefined();
    await expect(repository.listPhotos({ userId, condominiumId })).resolves.toEqual([]);
  });
});
