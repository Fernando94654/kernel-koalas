// Chat UI: historial en localStorage, stateless en servidor.
let conversationHistory = JSON.parse(localStorage.getItem("chatHistory") || "[]");

const QUICK = [
  "¿Cuáles son los CEDIS en zona roja?",
  "¿Qué producto se sustituye más?",
  "Dame un resumen ejecutivo del sistema",
  "¿Qué CEDIS tiene el mayor riesgo?",
  "¿Cuáles son los sustitutos de Coca - Cola?",
  "¿En qué países hay más sustituciones?",
];

function initChat() {
  document.getElementById("quick-buttons").innerHTML =
    QUICK.map((q) => `<button onclick="askQuick(this)">${q}</button>`).join("");
  document.getElementById("btn-send").onclick = onSend;
  document.getElementById("chat-input").addEventListener("keydown", (e) => { if (e.key === "Enter") onSend(); });
  document.getElementById("btn-clear").onclick = clearConversation;
  // Re-render historial guardado
  conversationHistory.forEach((m) => appendMessage(m.role, m.content, false));
  if (!conversationHistory.length) {
    appendMessage("assistant", "¡Hola! Soy tu asistente de Order Rescue. Pregúntame sobre CEDIS, SKUs o pedidos.", false);
  }
}

function askQuick(btn) {
  document.getElementById("chat-input").value = btn.textContent;
  onSend();
}

function appendMessage(role, content, scroll = true) {
  const box = document.getElementById("messages");
  const ts = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.innerHTML = `${escapeHtml(content)}<span class="ts">${ts}</span>`;
  box.appendChild(div);
  if (scroll) box.scrollTop = box.scrollHeight;
  return div;
}
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function onSend() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  appendMessage("user", text);

  const loading = document.createElement("div");
  loading.className = "msg assistant";
  loading.innerHTML = `<span class="spinner"></span> Analizando datos…`;
  document.getElementById("messages").appendChild(loading);
  document.getElementById("messages").scrollTop = 1e9;

  try {
    const data = await postJSON("/api/chat", { message: text, history: conversationHistory });
    conversationHistory = data.history;
    localStorage.setItem("chatHistory", JSON.stringify(conversationHistory));
    loading.remove();
    appendMessage("assistant", data.response);
    document.getElementById("provider").textContent = data.provider || "IA no configurada";
  } catch (e) {
    loading.remove();
    appendMessage("assistant", "Error de conexión. Intenta de nuevo.");
  }
}

function clearConversation() {
  conversationHistory = [];
  localStorage.removeItem("chatHistory");
  document.getElementById("messages").innerHTML = "";
  appendMessage("assistant", "Conversación reiniciada. ¿En qué te ayudo?", false);
}
