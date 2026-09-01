const state = {
  step: 1,
  name: "",
  role: "Síndico profissional",
  condo: "",
  address: "",
  messages: [],
  pending: false
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

const icons = {
  building: "⌂",
  people: "♧",
  manager: "✦"
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "RM"
  ).toUpperCase();
}

function renderOnboarding() {
  const step = state.step;
  stepLabel.textContent = `Passo ${step} de 3`;
  progressFill.style.width = `${step * 33.333}%`;

  if (step === 1) {
    onboardingContent.innerHTML = `
      <p class="step-kicker">BEM-VINDO À CORA</p>
      <h1 class="step-title">Vamos deixar tudo pronto para você.</h1>
      <p class="step-copy">Antes de começar, conte só o essencial. Assim a Cora fala com você do jeito certo.</p>
      <div class="field-group">
        <span class="field-label">Como podemos te chamar?</span>
        <input class="text-field" id="nameField" autocomplete="name" placeholder="Seu nome" value="${escapeHtml(state.name)}" />
      </div>
      <div class="field-group">
        <span class="field-label">Qual é o seu perfil?</span>
        <div class="role-grid" role="group" aria-label="Perfil profissional">
          ${[
            ["manager", "Síndico profissional"],
            ["building", "Síndico morador"],
            ["people", "Administradora"]
          ]
            .map(
              ([symbol, label]) =>
                `<button type="button" class="role-option ${state.role === label ? "selected" : ""}" data-role="${label}"><span class="role-symbol">${icons[symbol]}</span>${label}</button>`
            )
            .join("")}
        </div>
      </div>
      <div class="button-row"><button class="primary-button" type="button" data-action="next">Continuar <span class="button-arrow">→</span></button></div>
    `;
    document.querySelector("#nameField").addEventListener("input", (event) => {
      state.name = event.target.value;
    });
    document.querySelectorAll("[data-role]").forEach((button) =>
      button.addEventListener("click", () => {
        state.role = button.dataset.role;
        renderOnboarding();
      })
    );
  } else if (step === 2) {
    onboardingContent.innerHTML = `
      <p class="step-kicker">SEU PRIMEIRO CONTEXTO</p>
      <h1 class="step-title">Qual condomínio você cuida primeiro?</h1>
      <p class="step-copy">A Cora mantém cada condomínio em um espaço separado. Você poderá adicionar outros depois.</p>
      <div class="field-group">
        <label class="field-label" for="condoField">Nome do condomínio</label>
        <input class="text-field" id="condoField" autocomplete="organization" placeholder="Ex.: Residencial Aurora" value="${escapeHtml(state.condo)}" />
      </div>
      <div class="field-group">
        <label class="field-label" for="addressField">Cidade e estado <span style="color:#9aa7a7;font-weight:500">(opcional)</span></label>
        <input class="text-field" id="addressField" autocomplete="address-level2" placeholder="Ex.: São Paulo, SP" value="${escapeHtml(state.address)}" />
      </div>
      <div id="stepValidation"></div>
      <div class="button-row"><button class="secondary-button" type="button" data-action="back">Voltar</button><button class="primary-button" type="button" data-action="next">Continuar <span class="button-arrow">→</span></button></div>
    `;
    document.querySelector("#condoField").addEventListener("input", (event) => {
      state.condo = event.target.value;
    });
    document.querySelector("#addressField").addEventListener("input", (event) => {
      state.address = event.target.value;
    });
  } else {
    const safeName = escapeHtml(state.name || "Síndico");
    const safeCondo = escapeHtml(state.condo || "Seu condomínio");
    const safeAddress = escapeHtml(state.address || "Contexto privado");
    onboardingContent.innerHTML = `
      <p class="step-kicker">TUDO PRONTO</p>
      <h1 class="step-title">Seu espaço está preparado.</h1>
      <p class="step-copy">A partir de agora, suas perguntas ficam organizadas no contexto certo e a Cora já pode começar a ajudar.</p>
      <div class="ready-card">
        <div class="ready-card-head"><div class="ready-avatar">${escapeHtml(initials(state.name))}</div><div><strong>${safeName}</strong><span>${escapeHtml(state.role)}</span></div></div>
        <div class="ready-message"><strong>${safeCondo}</strong><span>${safeAddress}</span></div>
      </div>
      <div class="button-row"><button class="secondary-button" type="button" data-action="back">Voltar</button><button class="primary-button" type="button" data-action="start">Abrir meu chat <span class="button-arrow">↗</span></button></div>
    `;
  }

  document.querySelector('[data-action="next"]')?.addEventListener("click", () => {
    if (state.step === 1 && !state.name.trim()) {
      showValidation("Digite seu nome para continuar.");
      return;
    }
    if (state.step === 2 && !state.condo.trim()) {
      showValidation("Digite o nome do condomínio para continuar.");
      return;
    }
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
  const existing = target.querySelector(".validation-message");
  if (existing) existing.remove();
  const error = document.createElement("p");
  error.className = "validation-message";
  error.textContent = message;
  target.append(error);
}

function startChat() {
  onboardingView.hidden = true;
  chatView.hidden = false;
  document.querySelector("#profileName").textContent = state.name || "Rafael Martins";
  document.querySelector("#profileRole").textContent = state.role;
  document.querySelector("#profileAvatar").textContent = initials(state.name || "Rafael Martins");
  document.querySelector("#sidebarCondoName").textContent = state.condo || "Residencial Aurora";
  renderMessages();
  setTimeout(() => messageInput.focus(), 100);
}

function renderMessages() {
  const defaultMessages = [{ role: "assistant", type: "welcome" }];
  const messages = state.messages.length ? state.messages : defaultMessages;
  messageList.innerHTML = messages
    .map((message) => {
      if (message.role === "user") {
        return `<div class="message-row user"><div class="message-content"><div class="message-bubble"><p>${escapeHtml(message.text)}</p></div><div class="message-time">agora · enviado</div></div></div>`;
      }
      if (message.type === "welcome") {
        return `<div class="message-row"><div class="message-avatar">c</div><div class="message-content"><div class="message-bubble welcome-message"><p class="message-intro">Oi, ${escapeHtml(state.name || "tudo bem")}! Eu sou a Cora. ✨</p><p>Estou aqui para encontrar respostas nos documentos do <strong>${escapeHtml(state.condo || "seu condomínio")}</strong> e te ajudar a decidir com mais segurança.</p><p>Por onde começamos?</p><div class="quick-actions"><button class="quick-action" data-suggestion="Consultar a convenção sobre locação por temporada">Consultar um documento</button><button class="quick-action" data-suggestion="Quais são as pendências desta semana?">Ver pendências</button><button class="quick-action" data-suggestion="Preciso preparar um aviso para os moradores">Preparar um aviso</button></div></div><div class="message-time">agora · Cora</div></div></div>`;
      }
      const citation = message.citation
        ? `<button class="citation-link" data-citation="source"><span class="citation-dot"></span>${escapeHtml(message.citation)}</button>`
        : "";
      return `<div class="message-row"><div class="message-avatar">c</div><div class="message-content"><div class="message-bubble"><p>${message.html || escapeHtml(message.text)}</p>${citation}</div><div class="message-time">agora · Cora</div></div></div>`;
    })
    .join("");
  if (state.pending) {
    messageList.insertAdjacentHTML(
      "beforeend",
      '<div class="message-row"><div class="message-avatar">c</div><div class="message-content"><div class="message-bubble typing-bubble"><span></span><span></span><span></span></div></div></div>'
    );
  }
  document
    .querySelectorAll("[data-suggestion]")
    .forEach((button) =>
      button.addEventListener("click", () => submitPrompt(button.dataset.suggestion))
    );
  document
    .querySelectorAll("[data-citation]")
    .forEach((button) => button.addEventListener("click", openSource));
  chatCanvas.scrollTop = chatCanvas.scrollHeight;
}

function getResponse(prompt) {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("locação") || normalized.includes("temporada")) {
    return {
      html: "Na versão confirmada da Convenção, a locação por temporada deve respeitar o limite de 30 dias e as regras de sossego e segurança das áreas comuns. Como esse tema pode envolver interpretação e legislação externa, vale validar o caso concreto antes de aplicar qualquer medida.",
      citation: "Convenção do condomínio · p. 8"
    };
  }
  if (normalized.includes("pendência") || normalized.includes("semana")) {
    return {
      html: "Encontrei <strong>3 pendências</strong> abertas para esta semana: renovar o contrato de manutenção dos elevadores, confirmar a vistoria dos extintores e revisar o orçamento da pintura. Posso abrir cada uma e mostrar a fonte relacionada."
    };
  }
  if (normalized.includes("aviso") || normalized.includes("moradores")) {
    return {
      html: "Posso preparar um rascunho de aviso usando apenas os fatos confirmados nos documentos. Antes de qualquer envio, você revisa o texto e confirma o destinatário."
    };
  }
  if (normalized.includes("assembleia") || normalized.includes("voto")) {
    return {
      html: "Posso verificar a regra de quórum e quem pode votar. Para responder com segurança, vou cruzar a Convenção vigente com a ata mais recente e destacar qualquer conflito.",
      citation: "Convenção do condomínio · p. 12"
    };
  }
  return {
    html: "Posso procurar isso nos documentos autorizados do condomínio. Se eu não encontrar evidência suficiente, vou te avisar claramente e indicar o que precisa ser confirmado."
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

function openSource() {
  const drawer = document.querySelector("#sourceDrawer");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeSource() {
  const drawer = document.querySelector("#sourceDrawer");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
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
  if (file) showToast(`“${file.name}” pronto para entrar na base documental.`);
  event.target.value = "";
});
document.querySelector("#openSidebar").addEventListener("click", () => toggleSidebar(true));
document.querySelector("#closeSidebar").addEventListener("click", () => toggleSidebar(false));
document.querySelector("#sidebarScrim").addEventListener("click", () => toggleSidebar(false));
document.querySelector("#closeSource").addEventListener("click", closeSource);
document
  .querySelector("#sourceOpenButton")
  .addEventListener("click", () =>
    showToast("Visualização completa da fonte ficará disponível no próximo passo.")
  );
document
  .querySelectorAll("[data-nav]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      showToast(
        `${button.dataset.nav === "documentos" ? "Documentos" : "Pendências"}: seção demonstrativa.`
      )
    )
  );

renderOnboarding();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => undefined);
}
