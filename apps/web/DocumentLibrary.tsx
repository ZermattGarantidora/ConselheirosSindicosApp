import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  documentCategories,
  documentValidityLabel,
  filterLibraryDocuments,
  isDocumentAvailable,
  libraryDocumentCategory,
  scopedLibraryDocuments,
  summarizeDocumentAvailability,
  type AvailabilityFilter,
  type LibraryDocument,
  type LibrarySection
} from "./document-library.js";
import { documentProcessingLabel } from "./document-processing-request.js";

export function DocumentAvailability({
  documents
}: Readonly<{ documents: readonly LibraryDocument[] }>) {
  const summary = summarizeDocumentAvailability(documents);
  return (
    <section className="document-availability" aria-label="Arquivos disponíveis">
      <div className="availability-heading">
        <div>
          <span>DOCUMENTOS ENVIADOS</span>
          <h2>Arquivos disponíveis</h2>
        </div>
        <strong>
          {summary.available} de {summary.total}
        </strong>
      </div>
      <p>
        {summary.total === 0
          ? "Nenhum documento enviado."
          : summary.attention === 0
            ? summary.total === 1
              ? "O arquivo enviado está disponível para apoiar suas consultas."
              : "Os arquivos enviados estão disponíveis para apoiar suas consultas."
            : `${summary.attention} ${summary.attention === 1 ? "arquivo aguarda" : "arquivos aguardam"} processamento, confirmação ou revisão.`}
      </p>
      <p className="availability-limit">
        Essa contagem considera apenas o que foi enviado. Outros documentos podem ser necessários
        conforme o assunto da conversa.
      </p>
      <details>
        <summary>Detalhes da disponibilidade dos envios</summary>
        {summary.total > 0 ? (
          <p>
            <strong>{summary.percentage}% dos arquivos enviados disponíveis para consulta.</strong>
          </p>
        ) : null}
        <p>
          Versões prontas, com vigência confirmada ou não aplicável e sem confirmação de condomínio
          pendente, divididas pelo total das versões nesta área, antes da busca e dos filtros. O
          resultado é arredondado e não inclui versões anteriores ou arquivadas que não aparecem
          nesta lista.
        </p>
        <p>
          Disponibilidade dos arquivos enviados; não é uma taxa de acerto nem uma garantia de
          vigência. Não mede cobertura de todos os assuntos nem confirma vigência ou ausência de
          conflitos. A Alvitra também oferece orientação geral sem anexos.
        </p>
      </details>
    </section>
  );
}

export function LibraryDocumentList({
  documents,
  onOpen,
  confirmationControl
}: Readonly<{
  documents: readonly LibraryDocument[];
  onOpen: (document: LibraryDocument) => void;
  confirmationControl: (document: LibraryDocument) => ReactNode;
}>) {
  return documentCategories.map((category) => {
    const items = documents.filter(
      (document) => libraryDocumentCategory(document) === category.type
    );
    if (items.length === 0) return null;
    return (
      <section className="library-category" key={category.type} aria-label={category.label}>
        <header>
          <div>
            <h3>
              {category.label} <span>{items.length}</span>
            </h3>
            <p>{category.description}</p>
          </div>
        </header>
        <div className="library-document-grid">
          {items.map((document) => (
            <article className="library-document" key={document.documentVersionId}>
              <span className={`document-state${isDocumentAvailable(document) ? " is-ready" : ""}`}>
                {document.condominiumCheck?.status === "pending"
                  ? "Confirmar condomínio"
                  : document.processingStatus === "ready" && !isDocumentAvailable(document)
                    ? documentValidityLabel(document.validityStatus)
                    : documentProcessingLabel(document.processingStatus)}
              </span>
              <button
                type="button"
                className="document-open-button"
                onClick={() => onOpen(document)}
                aria-label={`Visualizar ${document.title}`}
              >
                {document.title}
              </button>
              <small>
                Versão {document.versionNumber} · Enviado em{" "}
                {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(
                  new Date(document.createdAt)
                )}
              </small>
              <small
                className={
                  document.validityStatus === "disputed" || document.validityStatus === "superseded"
                    ? "document-validity-warning"
                    : undefined
                }
              >
                {documentValidityLabel(document.validityStatus)}
              </small>
              {confirmationControl(document)}
            </article>
          ))}
        </div>
      </section>
    );
  });
}

export function DocumentLibrary({
  condominiumId,
  condominiumName,
  documents,
  initialSection = "all",
  pending,
  error,
  onRetry,
  onClose,
  onOpen,
  confirmationControl
}: Readonly<{
  condominiumId: string;
  condominiumName: string;
  documents: readonly LibraryDocument[];
  initialSection?: LibrarySection;
  pending: boolean;
  error: string;
  onRetry: () => void;
  onClose: () => void;
  onOpen: (document: LibraryDocument) => void;
  confirmationControl: (document: LibraryDocument) => ReactNode;
}>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<LibrarySection>(initialSection);
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const scopedDocuments = scopedLibraryDocuments(documents, condominiumId);
  const sectionDocuments = filterLibraryDocuments(scopedDocuments, "", section, "all");
  const visible = filterLibraryDocuments(sectionDocuments, search, category, availability);
  useEffect(() => {
    const previousFocus = window.document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="document-library"
      aria-labelledby="document-library-title"
      onCancel={onClose}
    >
      <header className="library-heading">
        <div>
          <span>DOCUMENTOS DO CONDOMÍNIO</span>
          <h1 id="document-library-title">{condominiumName}</h1>
          <p>Sua base para conversar com a Alvitra.</p>
        </div>
        <button type="button" onClick={onClose} autoFocus>
          Voltar à conversa
        </button>
      </header>
      <nav className="library-sections" aria-label="Áreas da biblioteca">
        {(
          [
            ["all", "Todos os documentos"],
            ["financial_statement", "Balancetes"]
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={section === value}
            onClick={() => {
              setSection(value);
              setCategory("all");
              setSearch("");
              setAvailability("all");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="library-content">
        {pending ? (
          <p role="status">Carregando documentos autorizados...</p>
        ) : error !== "" ? (
          <div role="alert">
            <p>{error}</p>
            <button type="button" onClick={onRetry}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            {section === "financial_statement" ? (
              <p className="library-section-note">
                Somente balancetes e prestações de contas identificados na leitura dos arquivos.
              </p>
            ) : null}
            <DocumentAvailability documents={sectionDocuments} />
            <div
              className={`library-filters${section === "financial_statement" ? " is-financial" : ""}`}
            >
              <label>
                Buscar documento
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome do documento..."
                />
              </label>
              {section === "all" ? (
                <label>
                  Categoria
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    <option value="all">Todas as categorias ({scopedDocuments.length})</option>
                    {documentCategories.map((item) => (
                      <option key={item.type} value={item.type}>
                        {item.label} (
                        {
                          scopedDocuments.filter(
                            (document) => libraryDocumentCategory(document) === item.type
                          ).length
                        }
                        )
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                Disponibilidade
                <select
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)}
                >
                  <option value="all">Todos os estados</option>
                  <option value="available">Disponíveis para consulta</option>
                  <option value="attention">Aguardando ou precisam de atenção</option>
                </select>
              </label>
            </div>
            <p className="library-result-count" role="status">
              {visible.length} de {sectionDocuments.length} versões
            </p>
            {sectionDocuments.length === 0 ? (
              <div className="library-empty">
                <h2>
                  {section === "financial_statement"
                    ? "Nenhum balancete identificado"
                    : "Os documentos do seu condomínio ficam aqui"}
                </h2>
                <p>
                  {section === "financial_statement"
                    ? "Envie balancetes pela conversa. Eles aparecem aqui após serem identificados na leitura; arquivos ainda sem classificação e os demais documentos ficam em Todos os documentos."
                    : "Envie os arquivos pela conversa, quando precisar. A Alvitra organiza a base à medida que eles chegam."}
                </p>
              </div>
            ) : visible.length === 0 ? (
              <div className="library-empty">
                <h2>Nenhum documento com esses filtros</h2>
                <p>Tente outro nome, categoria ou estado.</p>
              </div>
            ) : (
              <LibraryDocumentList
                documents={visible}
                onOpen={onOpen}
                confirmationControl={confirmationControl}
              />
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
