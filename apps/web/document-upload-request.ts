type FetchDocumentRequest = (url: string, init?: RequestInit) => Promise<Response>;

type UploadRequestInput = Readonly<{
  condominiumId: string;
  content: BodyInit;
  title: string;
  documentType: string;
  authMode: "real" | "development";
  developmentUserId?: string;
}>;

function developmentHeaders(input: UploadRequestInput): Record<string, string> {
  return input.authMode === "development" && input.developmentUserId !== undefined
    ? { "x-development-user-id": input.developmentUserId }
    : {};
}

export async function requestDocumentUploadWithAuthorizationRecovery(
  fetchRequest: FetchDocumentRequest,
  input: UploadRequestInput
): Promise<Response> {
  const condominiumId = encodeURIComponent(input.condominiumId);
  const sendDocument = () =>
    fetchRequest(`/v1/condominiums/${condominiumId}/documents`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/pdf",
        ...developmentHeaders(input),
        "x-document-title": encodeURIComponent(input.title),
        "x-document-type": input.documentType,
        "x-document-validity-confirmed": "true"
      },
      body: input.content
    });

  const firstResponse = await sendDocument();
  if (firstResponse.status !== 401 && firstResponse.status !== 403) return firstResponse;

  const contextResponse = await fetchRequest(`/v1/condominiums/${condominiumId}/context`, {
    credentials: "same-origin",
    headers: developmentHeaders(input)
  });
  if (!contextResponse.ok) return firstResponse;

  const context = (await contextResponse.json().catch(() => undefined)) as
    Readonly<{ condominiumId?: unknown; permissions?: unknown }> | undefined;
  if (
    context?.condominiumId !== input.condominiumId ||
    !Array.isArray(context.permissions) ||
    !context.permissions.includes("document:upload")
  ) {
    return firstResponse;
  }

  return sendDocument();
}
