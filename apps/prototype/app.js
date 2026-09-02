const state = {
  step: 1,
  name: "",
  role: "Síndico profissional",
  condo: "",
  address: "",
  condominiums: [],
  activeCondominiumId: undefined,
  messages: [],
  pending: false,
  activeSource: undefined
};
const onboardingView = document.querySelector("#onboardingView");
const chatView = document.querySelector("#chatView");
const onboardingContent = document.querySelector("#onboardingContent");
const progressFill = document.querySelector("#progressFill");
const stepLabel = document.querySelector("#stepLabel");
const messageList = document.querySelector("#messageList");
const chatCanvas = document.querySelector("#chatCanvas");
const messageInput = document.querySelector("#messageInput");
const composerForm = document.querySelector("#composerForm");
const toast = document.querySelector("#toast");
const condominiumList = document.querySelector("#condominiumList");
const workspaceDrawer = document.querySelector("#workspaceDrawer");
const workspaceCurrent = document.querySelector("#workspaceCurrent");
const workspaceFiles = document.querySelector("#workspaceFiles");
const icons = { building: "⌂", people: "♧", manager: "✦" };

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function initials(name) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "CO"
  ).toUpperCase();
}
function activeCondominium() {
  return state.condominiums.find((condominium) => condominium.id === state.activeCondominiumId);
}
function createCondominium(name, location, includeDemoFile = false) {
  const condominium = {
    id: `condominium-${Date.now()}-${state.condominiums.length}`,
    name: name.trim(),
    location: location.trim() || "Contexto privado",
    files: includeDemoFile
      ? [
          {
            id: "demo-convencao",
            name: "Convenção condominial — demonstração.txt",
            details: "Versão confirmada · página 8",
            excerpt:
              "A locação das unidades por temporada deverá observar o limite de 30 dias, respeitando o sossego e a segurança das áreas comuns."
          }
        ]
      : []
  };
  state.condominiums.push(condominium);
  state.activeCondominiumId = condominium.id;
  return condominium;
}

function renderOnboarding() {
  const step = state.step;
  stepLabel.textContent = `Passo ${step} de 3`;
  progressFill.style.width = `${step * 33.333}%`;
  if (step === 1) {
    onboardingContent.innerHTML = `<p class="step-kicker">BEM-VINDO À CORA</p><h1 class="step-title">Vamos deixar tudo pronto para você.</h1><p class="step-copy">Antes de começar, conte só o essencial. Assim a Cora fala com você do jeito certo.</p><div class="field-group"><span class="field-label">Como podemos te chamar?</span><input class="text-field" id="nameField" autocomplete="name" placeholder="Seu nome" value="${escapeHtml(state.name)}" /></div><div class="field-group"><span class="field-label">Qual é o seu perfil?</span><div class="role-grid" role="group" aria-label="Perfil profissional">${[
      ["manager", "Síndico profissional"],
      ["building", "Síndico morador"],
      ["people", "Administradora"]
    ]
      .map(
        ([symbol, label]) =>
          `<button type="button" class="role-option ${state.role === label ? "selected" : ""}" data-role="${label}"><span class="role-symbol">${icons[symbol]}</span>${label}</button>`
      )
      .join(
        ""
      )}</div></div><div class="button-row"><button class="primary-button" type="button" data-action="next">Continuar <span class="button-arrow">→</span></button></div>`;
    document
      .querySelector("#nameField")
      .addEventListener("input", (event) => (state.name = event.target.value));
    document.querySelectorAll("[data-role]").forEach((button) =>
      button.addEventListener("click", () => {
        state.role = button.dataset.role;
        renderOnboarding();
      })
    );
  } else if (step === 2) {
    onboardingContent.innerHTML = `<p class="step-kicker">SEU PRIMEIRO CONTEXTO</p><h1 class="step-title">Qual condomínio você cuida primeiro?</h1><p class="step-copy">A Cora mantém cada condomínio em um espaço separado. Você poderá adicionar outros depois.</p><div class="field-group"><label class="field-label" for="condoField">Nome do condomínio</label><input class="text-field" id="condoField" autocomplete="organization" placeholder="Ex.: Residencial Aurora" value="${escapeHtml(state.condo)}" /></div><div class="field-group"><label class="field-label" for="addressField">Cidade e estado <span style="color:#9aa7a7;font-weight:500">(opcional)</span></label><input class="text-field" id="addressField" autocomplete="address-level2" placeholder="Ex.: São Paulo, SP" value="${escapeHtml(state.address)}" /></div><div id="stepValidation"></div><div class="button-row"><button class="secondary-button" type="button" data-action="back">Voltar</button><button class="primary-button" type="button" data-action="next">Continuar <span class="button-arrow">→</span></button></div>`;
    document
      .querySelector("#condoField")
      .addEventListener("input", (event) => (state.condo = event.target.value));
    document
      .querySelector("#addressField")
      .addEventListener("input", (event) => (state.address = event.target.value));
  } else {
    onboardingContent.innerHTML = `<p class="step-kicker">TUDO PRONTO</p><h1 class="step-title">Seu espaço está preparado.</h1><p class="step-copy">A partir de agora, suas perguntas ficam organizadas no contexto certo e a Cora já pode começar a ajudar.</p><div class="ready-card"><div class="ready-card-head"><div class="ready-avatar">${escapeHtml(initials(state.name))}</div><div><strong>${escapeHtml(state.name || "Síndico")}</strong><span>${escapeHtml(state.role)}</span></div></div><div class="ready-message"><strong>${escapeHtml(state.condo || "Seu condomínio")}</strong><span>${escapeHtml(state.address || "Contexto privado")}</span></div></div><div class="button-row"><button class="secondary-button" type="button" data-action="back">Voltar</button><button class="primary-button" type="button" data-action="start">Abrir meu chat <span class="button-arrow">↗</span></button></div>`;
  }
  document.querySelector('[data-action="next"]')?.addEventListener("click", () => {
    if (state.step === 1 && !state.name.trim())
      return showValidation("Digite seu nome para continuar.");
    if (state.step === 2 && !state.condo.trim())
      return showValidation("Digite o nome do condomínio para continuar.");
    state.step += 1;
    renderOnboarding();
  });
  document.querySelector('[data-action="back"]')?.addEventListener("click", () => {
    state.step -= 1;
    renderOnboarding();
  });
  document.querySelector('[data-action="start"]')?.addEventListener("click", startChat);
}
function showValidation(message) {
  const target = document.querySelector("#stepValidation") || onboardingContent;
  target.querySelector(".validation-message")?.remove();
  const error = document.createElement("p");
  error.className = "validation-message";
  error.textContent = message;
  target.append(error);
}
function startChat() {
  createCondominium(state.condo || "Residencial Aurora", state.address, true);
  onboardingView.hidden = true;
  chatView.hidden = false;
  document.querySelector("#profileName").textContent = state.name || "Rafael Martins";
  document.querySelector("#profileRole").textContent = state.role;
  document.querySelector("#profileAvatar").textContent = initials(state.name || "Rafael Martins");
  renderCondominiums();
  renderMessages();
  window.setTimeout(() => messageInput.focus(), 100);
}

function renderCondominiums() {
  condominiumList.innerHTML = state.condominiums
    .map(
      (condominium) =>
        `<button class="condo-switcher ${condominium.id === state.activeCondominiumId ? "active" : ""}" data-condominium-id="${condominium.id}"><span class="condo-avatar">${escapeHtml(initials(condominium.name))}</span><span class="condo-copy"><strong>${escapeHtml(condominium.name)}</strong><small>${escapeHtml(condominium.location)}</small></span>${condominium.id === state.activeCondominiumId ? '<span class="active-check">✓</span>' : ""}</button>`
    )
    .join("");
  document.querySelectorAll("[data-condominium-id]").forEach((button) =>
    button.addEventListener("click", () => {
      state.activeCondominiumId = button.dataset.condominiumId;
      state.messages = [];
      state.activeSource = undefined;
      closeSource();
      renderCondominiums();
      renderMessages();
      renderWorkspace();
      toggleSidebar(false);
    })
  );
}
function renderMessages() {
  const condominium = activeCondominium();
  const messages = state.messages.length
    ? state.messages
    : [{ role: "assistant", type: "welcome" }];
  messageList.innerHTML = messages
    .map((message) => {
      if (message.role === "user")
        return `<div class="message-row user"><div class="message-content"><div class="message-bubble"><p>${escapeHtml(message.text)}</p></div><div class="message-time">agora · enviado</div></div></div>`;
      if (message.type === "welcome")
        return `<div class="message-row"><div class="message-avatar">c</div><div class="message-content"><div class="message-bubble welcome-message"><p class="message-intro">Oi, ${escapeHtml(state.name || "tudo bem")}! Eu sou a Cora. ✨</p><p>Estou no contexto de <strong>${escapeHtml(condominium.name)}</strong>. Há <strong>${condominium.files.length} arquivo${condominium.files.length === 1 ? "" : "s"}</strong> disponível${condominium.files.length === 1 ? "" : "is"} só aqui.</p><p>Por onde começamos?</p><div class="quick-actions"><button class="quick-action" data-suggestion="Consultar a convenção sobre locação por temporada">Consultar um documento</button><button class="quick-action" data-suggestion="Quais são as pendências desta semana?">Ver pendências</button><button class="quick-action" data-suggestion="Preciso preparar um aviso para os moradores">Preparar um aviso</button></div></div><div class="message-time">agora · Cora</div></div></div>`;
      const citation = message.citation
        ? `<button class="citation-link" data-citation-id="${message.citation.id}"><span class="citation-dot"></span>${escapeHtml(message.citation.name)} · ${escapeHtml(message.citation.details)}</button>`
        : "";
      return `<div class="message-row"><div class="message-avatar">c</div><div class="message-content"><div class="message-bubble"><p>${message.html || escapeHtml(message.text)}</p>${citation}</div><div class="message-time">agora · Cora</div></div></div>`;
    })
    .join("");
  if (state.pending)
    messageList.insertAdjacentHTML(
      "beforeend",
      '<div class="message-row"><div class="message-avatar">c</div><div class="message-content"><div class="message-bubble typing-bubble"><span></span><span></span><span></span></div></div></div>'
    );
  document
    .querySelectorAll("[data-suggestion]")
    .forEach((button) =>
      button.addEventListener("click", () => submitPrompt(button.dataset.suggestion))
    );
  document
    .querySelectorAll("[data-citation-id]")
    .forEach((button) =>
      button.addEventListener("click", () => openSource(button.dataset.citationId))
    );
  chatCanvas.scrollTop = chatCanvas.scrollHeight;
}
function getResponse(prompt) {
  const condominium = activeCondominium();
  const normalized = prompt.toLowerCase();
  if (!condominium.files.length)
    return {
      html: `Não encontrei documentos no espaço de <strong>${escapeHtml(condominium.name)}</strong>. Para não usar informações de outro condomínio, anexe um arquivo a este contexto antes de responder.`
    };
  const demoCitation = condominium.files.find((file) => file.id === "demo-convencao");
  if (normalized.includes("locação") || normalized.includes("temporada")) {
    if (!demoCitation)
      return {
        html: "Há arquivos neste condomínio, mas esta prévia não lê seu conteúdo. Por isso, não consigo confirmar uma regra sobre locação por temporada sem inventar uma resposta."
      };
    return {
      html: "No documento de demonstração disponível neste condomínio, a locação por temporada deve respeitar o limite de 30 dias e as regras de sossego e segurança. Como o tema pode envolver interpretação jurídica, valide o caso concreto antes de aplicar qualquer medida.",
      citation: demoCitation
    };
  }
  if (normalized.includes("pendência") || normalized.includes("semana"))
    return {
      html: "Nesta prévia, as pendências são simuladas. Em uma versão funcional, elas seriam extraídas apenas dos arquivos deste condomínio, com fonte e confirmação humana."
    };
  if (normalized.includes("aviso") || normalized.includes("moradores"))
    return {
      html: "Posso preparar um rascunho usando apenas fatos confirmados nos arquivos deste condomínio. Antes de qualquer envio, você revisa o texto e confirma o destinatário."
    };
  return {
    html: "Posso procurar isso somente nos arquivos do condomínio ativo. Se a base não for suficiente, vou indicar essa limitação em vez de usar outro contexto."
  };
}
function submitPrompt(prompt) {
  const text = String(prompt || "").trim();
  if (!text || state.pending) return;
  state.messages.push({ role: "user", text });
  state.pending = true;
  renderMessages();
  messageInput.value = "";
  window.setTimeout(() => {
    state.messages.push({ role: "assistant", ...getResponse(text) });
    state.pending = false;
    renderMessages();
  }, 650);
}
function openSource(fileId) {
  state.activeSource = activeCondominium().files.find((file) => file.id === fileId);
  if (!state.activeSource) return;
  document.querySelector(".source-doc-card strong").textContent = state.activeSource.name;
  document.querySelector(".source-doc-card small").textContent = state.activeSource.details;
  document.querySelector("#sourceExcerpt").textContent =
    `“${state.activeSource.excerpt || "O conteúdo do arquivo não é processado nesta prévia."}”`;
  document.querySelector("#sourceDrawer").classList.add("open");
  document.querySelector("#sourceDrawer").setAttribute("aria-hidden", "false");
}
function closeSource() {
  document.querySelector("#sourceDrawer").classList.remove("open");
  document.querySelector("#sourceDrawer").setAttribute("aria-hidden", "true");
}
function renderWorkspace() {
  const condominium = activeCondominium();
  if (!condominium) return;
  workspaceCurrent.innerHTML = `<strong>${escapeHtml(condominium.name)}</strong><small>${escapeHtml(condominium.location)} · ${condominium.files.length} arquivo${condominium.files.length === 1 ? "" : "s"}</small>`;
  workspaceFiles.innerHTML = condominium.files.length
    ? condominium.files
        .map(
          (file) =>
            `<div class="workspace-file"><span>▤</span><div><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(file.details)}</small></div></div>`
        )
        .join("")
    : '<div class="workspace-empty">Nenhum arquivo foi adicionado a este condomínio. Anexe um dos arquivos fictícios para testar.</div>';
}
function openWorkspace() {
  renderWorkspace();
  workspaceDrawer.classList.add("open");
  workspaceDrawer.setAttribute("aria-hidden", "false");
}
function closeWorkspace() {
  workspaceDrawer.classList.remove("open");
  workspaceDrawer.setAttribute("aria-hidden", "true");
}
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2700);
}
function toggleSidebar(open) {
  document.querySelector("#chatSidebar").classList.toggle("open", open);
  document.querySelector("#sidebarScrim").classList.toggle("visible", open);
}

composerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitPrompt(messageInput.value);
});
messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 100)}px`;
});
document
  .querySelector("#attachButton")
  .addEventListener("click", () => document.querySelector("#fileInput").click());
document.querySelector("#fileInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) {
    activeCondominium().files.push({
      id: `file-${Date.now()}`,
      name: file.name,
      details: "Anexado nesta sessão · demonstração",
      excerpt: "O conteúdo do arquivo não é processado nesta prévia."
    });
    renderWorkspace();
    renderMessages();
    showToast(`“${file.name}” foi adicionado somente a ${activeCondominium().name}.`);
  }
  event.target.value = "";
});
document.querySelector("#addCondominium").addEventListener("click", openWorkspace);
document.querySelector("#closeWorkspace").addEventListener("click", closeWorkspace);
document.querySelector("#addCondominiumForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#newCondominiumName").value.trim();
  const location = document.querySelector("#newCondominiumLocation").value.trim();
  if (!name) return showToast("Informe o nome do novo condomínio.");
  const condominium = createCondominium(name, location);
  state.messages = [];
  document.querySelector("#newCondominiumName").value = "";
  document.querySelector("#newCondominiumLocation").value = "";
  renderCondominiums();
  renderMessages();
  renderWorkspace();
  showToast(`${condominium.name} foi criado com um espaço de arquivos separado.`);
});
document.querySelector("#openSidebar").addEventListener("click", () => toggleSidebar(true));
document.querySelector("#closeSidebar").addEventListener("click", () => toggleSidebar(false));
document.querySelector("#sidebarScrim").addEventListener("click", () => toggleSidebar(false));
document.querySelector("#closeSource").addEventListener("click", closeSource);
document
  .querySelector("#sourceOpenButton")
  .addEventListener("click", () =>
    showToast("A visualização do arquivo completo será incluída em uma próxima etapa.")
  );
document
  .querySelectorAll("[data-nav]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      button.dataset.nav === "documentos"
        ? openWorkspace()
        : showToast("Pendências: seção demonstrativa.")
    )
  );
renderOnboarding();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => undefined);
