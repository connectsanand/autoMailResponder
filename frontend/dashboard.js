// frontend/dashboard.js

const toggleBtn = document.getElementById("toggleBtn");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");
let isActive = false;

toggleBtn.addEventListener("click", async () => {
  const message = messageEl.value.trim();

  const res = await fetch("/api/auto-responder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, active: !isActive }),
  });

  if (res.ok) {
    isActive = !isActive;
    statusEl.textContent = isActive ? "Active ✅" : "Not Activated ❌";
    toggleBtn.textContent = isActive ? "Disable Auto-Responder" : "Enable Auto-Responder";
  } else {
    alert("Error updating auto-responder status.");
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  window.location.href = "/logout";
});
