const TORQUE_LOOKUP_TABLE = {
  20: { hase: null, haseForce: null, schild: 0.42, schildForce: 5.47 },
  30: { hase: null, haseForce: null, schild: 0.68, schildForce: 8.89 },
  40: { hase: 0.37, haseForce: 4.85, schild: 0.95, schildForce: 12.32 },
  50: { hase: 0.51, haseForce: 6.59, schild: 1.21, schildForce: 15.74 },
  60: { hase: 0.64, haseForce: 8.32, schild: 1.47, schildForce: 19.16 },
  70: { hase: 0.77, haseForce: 10.05, schild: 1.74, schildForce: 22.58 },
  80: { hase: 0.91, haseForce: 11.79, schild: 2.0, schildForce: 26.0 },
  90: { hase: 1.04, haseForce: 13.52, schild: 2.26, schildForce: 29.42 },
  100: { hase: 1.17, haseForce: 15.25, schild: 2.53, schildForce: 32.84 },
  110: { hase: 1.31, haseForce: 16.99, schild: 2.65, schildForce: 34.45 },
  120: { hase: 1.44, haseForce: 18.72, schild: 2.9, schildForce: 37.7 },
  130: { hase: 1.57, haseForce: 20.45, schild: 3.15, schildForce: 40.95 },
  140: { hase: 1.71, haseForce: 22.19, schild: 3.4, schildForce: 44.2 },
  150: { hase: 1.84, haseForce: 23.92, schild: 3.65, schildForce: 47.45 },
  160: { hase: 1.97, haseForce: 25.65, schild: 2.65, schildForce: 34.45 },
  170: { hase: 2.11, haseForce: 27.39, schild: 4.15, schildForce: 53.95 },
  180: { hase: 2.24, haseForce: 29.12, schild: 4.4, schildForce: 57.2 },
  190: { hase: 2.37, haseForce: 30.85, schild: 4.65, schildForce: 60.45 },
  200: { hase: 2.51, haseForce: 32.59, schild: 4.9, schildForce: 63.7 },
  210: { hase: 2.64, haseForce: 34.32, schild: 5.15, schildForce: 66.95 },
  220: { hase: 2.77, haseForce: 36.05, schild: 5.4, schildForce: 70.2 },
  230: { hase: 2.91, haseForce: 37.79, schild: 5.65, schildForce: 73.45 },
  240: { hase: 3.04, haseForce: 39.52, schild: 5.9, schildForce: 76.7 },
  250: { hase: 3.17, haseForce: 41.25, schild: 6.15, schildForce: 79.95 },
  260: { hase: 3.31, haseForce: 42.99, schild: 6.4, schildForce: 83.2 },
  270: { hase: 3.44, haseForce: 44.72, schild: 6.65, schildForce: 86.45 },
  280: { hase: 3.57, haseForce: 46.45, schild: 6.9, schildForce: 89.7 },
  290: { hase: 3.71, haseForce: 48.19, schild: 7.15, schildForce: 92.95 },
  300: { hase: 3.84, haseForce: 49.92, schild: 7.4, schildForce: 96.2 }
};

const KRINNER_SCHEMA = [
  { label: "5% von Prüflast", percent: 5, minutes: 5 },
  { label: "21%", percent: 21, minutes: 10 },
  { label: "37%", percent: 37, minutes: 10 },
  { label: "53%", percent: 53, minutes: 20 },
  { label: "5% (Entlastung)", percent: 5, minutes: 5 },
  { label: "53% (Wiederbelast.)", percent: 53, minutes: 5 },
  { label: "69%", percent: 69, minutes: 20 },
  { label: "85%", percent: 85, minutes: 20 },
  { label: "100%", percent: 100, minutes: 60 },
  { label: "5% (Abschluss)", percent: 5, minutes: 5 },
  { label: "120% (Versagen?)", percent: 120, minutes: 5, isExtra: true },
  { label: "140% (Versagen?)", percent: 140, minutes: 5, isExtra: true },
  { label: "160% (Versagen?)", percent: 160, minutes: 5, isExtra: true }
];

const activeTimers = {};

function setSyncStatus(text, tone) {
  const el = document.getElementById("sync-status");
  if (!el) return;
  el.textContent = `Cloud-Status: ${text}`;
  el.classList.remove("sync-ok", "sync-warn", "sync-error", "sync-progress");
  if (tone) el.classList.add(`sync-${tone}`);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function resetTimerUi(viewPrefix, index, originalMinutes) {
  const timerDisplay = document.getElementById(`${viewPrefix}-timer-display-${index}`);
  const btn = document.getElementById(`${viewPrefix}-timer-btn-${index}`);
  const row = document.getElementById(`${viewPrefix}-row-${index}`);

  if (timerDisplay) timerDisplay.textContent = `${originalMinutes}:00`;
  if (btn) {
    btn.textContent = "Start";
    btn.classList.remove("bg-gray-500");
    btn.classList.add("bg-blue-600");
  }
  if (row) row.classList.remove("timer-active", "timer-finished");
}

function toggleTimer(viewPrefix, index, minutes) {
  const timerId = `${viewPrefix}-${index}`;
  if (activeTimers[timerId]) {
    stopTimer(viewPrefix, index);
    return;
  }
  startTimer(viewPrefix, index, minutes);
}

function startTimer(viewPrefix, index, minutes) {
  const timerId = `${viewPrefix}-${index}`;
  let remaining = minutes * 60;
  const timerDisplay = document.getElementById(`${viewPrefix}-timer-display-${index}`);
  const btn = document.getElementById(`${viewPrefix}-timer-btn-${index}`);
  const row = document.getElementById(`${viewPrefix}-row-${index}`);

  if (!timerDisplay || !btn || !row) return;

  row.classList.add("timer-active");
  row.classList.remove("timer-finished");
  btn.textContent = "Reset";
  btn.classList.remove("bg-blue-600");
  btn.classList.add("bg-gray-500");

  activeTimers[timerId] = {
    originalMinutes: minutes,
    interval: setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(activeTimers[timerId].interval);
        delete activeTimers[timerId];
        timerDisplay.textContent = "0:00";
        row.classList.remove("timer-active");
        row.classList.add("timer-finished");
        btn.textContent = "Start";
        btn.classList.remove("bg-gray-500");
        btn.classList.add("bg-blue-600");
        return;
      }
      timerDisplay.textContent = formatTime(remaining);
    }, 1000)
  };
}

function stopTimer(viewPrefix, index) {
  const timerId = `${viewPrefix}-${index}`;
  const timer = activeTimers[timerId];
  if (!timer) return;

  clearInterval(timer.interval);
  delete activeTimers[timerId];
  resetTimerUi(viewPrefix, index, timer.originalMinutes);
}

function renumberTorqueRows() {
  const rows = document.querySelectorAll("#torque-body tr");
  rows.forEach((row, index) => {
    row.cells[0].textContent = index + 1;
  });
}

function addTorqueRow() {
  const tbody = document.getElementById("torque-body");
  const tr = document.createElement("tr");
  tr.className = "border-b border-gray-100 transition-colors hover:bg-gray-50/50";
  tr.innerHTML = `
    <td class="p-3 border-r border-gray-100 text-gray-400 font-bold text-center"></td>
    <td class="p-3 border-r border-gray-100">
      <div class="flex items-center justify-center gap-2 text-slate-900">
        <div onclick="setGear(this, 'schild')" class="gear-btn active p-2 bg-gray-50 rounded-lg icon-btn shadow-sm" data-gear="schild" title="Schildkröte">🐢</div>
        <div onclick="setGear(this, 'hase')" class="gear-btn p-2 bg-gray-50 rounded-lg icon-btn grayscale opacity-40 shadow-sm" data-gear="hase" title="Hase">🐇</div>
      </div>
    </td>
    <td class="p-3 border-r border-gray-100 text-center">
      <div class="flex flex-col items-center">
        <input type="number" step="10" placeholder="0" class="table-input bar-input font-black text-lg text-blue-900 focus:text-blue-600 text-slate-800" oninput="calcTorque(this)">
        <span class="text-[8px] font-black text-gray-300 uppercase mt-0.5">Bar</span>
      </div>
    </td>
    <td class="p-3 border-r border-gray-100 bg-blue-50/30 text-center"><div class="font-mono font-black text-blue-900 text-lg result-kNm">0.00</div></td>
    <td class="p-3 border-r border-gray-100 text-center text-slate-800"><div class="font-mono font-bold text-gray-500 text-base result-kN">0.0</div></td>
    <td class="p-3 text-center"><input type="text" placeholder="Pos" class="table-input !text-[10px] font-bold uppercase text-gray-500 text-slate-800"></td>
    <td class="p-3 text-center no-print text-slate-900">
      <button onclick="this.closest('tr').remove(); renumberTorqueRows();" class="text-gray-300 hover:text-red-500 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </td>`;

  tbody.appendChild(tr);
  renumberTorqueRows();
}

function setGear(btn, gear) {
  const row = btn.closest("tr");
  row.querySelectorAll(".gear-btn").forEach((b) => {
    b.classList.remove("active");
    b.classList.add("grayscale", "opacity-40");
  });
  btn.classList.add("active");
  btn.classList.remove("grayscale", "opacity-40");
  btn.dataset.gear = gear;
  calcTorque(row.querySelector(".bar-input"));
}

function calcTorque(input) {
  const row = input.closest("tr");
  let bar = parseInt(input.value, 10) || 0;
  bar = Math.floor(bar / 10) * 10;
  const activeGearBtn = row.querySelector(".gear-btn.active");
  const gear = activeGearBtn ? activeGearBtn.dataset.gear : "schild";
  const data = TORQUE_LOOKUP_TABLE[bar] || { hase: 0, schild: 0, haseForce: 0, schildForce: 0 };

  const kNm = gear === "hase" ? (data.hase || 0) : (data.schild || 0);
  const kN = gear === "hase" ? (data.haseForce || 0) : (data.schildForce || 0);

  row.querySelector(".result-kNm").textContent = kNm.toFixed(2);
  row.querySelector(".result-kN").textContent = kN.toFixed(1);
}

function calculateValues() {
  const maxForce = parseFloat(document.getElementById("maxForce").value) || 0;
  const tableBody = document.getElementById("tableBody");

  document.getElementById("force-5").textContent = `${(maxForce * 0.05).toFixed(1)} kN`;
  document.getElementById("force-160").textContent = `${(maxForce * 1.6).toFixed(1)} kN`;

  tableBody.innerHTML = "";
  KRINNER_SCHEMA.forEach((step, index) => {
    const calculatedKn = (maxForce * (step.percent / 100)).toFixed(1);
    const row = document.createElement("tr");
    row.id = `lb-row-${index}`;

    let rowClass = "border-b border-gray-200 transition-colors duration-300 text-slate-800 ";
    if (step.percent === 100) rowClass += "bg-blue-50/50 ";
    if (step.isExtra) rowClass += "bg-orange-50/20 ";
    row.className = rowClass;

    row.innerHTML = `
      <td class="p-3 border-r border-gray-200 font-bold ${step.isExtra ? "text-orange-700 font-black" : "text-gray-700"}">${step.label}</td>
      <td class="p-3 border-r border-gray-200 text-center font-mono text-blue-800 font-bold text-sm text-blue-900">${calculatedKn}</td>
      <td class="p-3 border-r border-gray-200 text-center text-gray-600 font-bold cursor-pointer-hover" onclick="stopTimer('lb', ${index})">${step.minutes} Min</td>
      <td class="p-3 border-r border-gray-200 text-center no-print">
        <div class="flex items-center justify-center gap-3 text-slate-900">
          <span id="lb-timer-display-${index}" class="font-mono font-black text-gray-800 text-sm w-12 text-slate-800">${step.minutes}:00</span>
          <button id="lb-timer-btn-${index}" onclick="toggleTimer('lb', ${index}, ${step.minutes})" class="bg-blue-600 text-white text-[10px] px-3 py-1 rounded font-bold transition uppercase">Start</button>
        </div>
      </td>
      <td class="p-3 border-r border-gray-200"><div class="flex items-end justify-center gap-1 text-slate-900"><input type="number" step="0.01" class="table-input w-16 px-1 text-slate-800"><span class="text-[9px] text-gray-400">mm</span></div></td>
      <td class="p-3"><div class="flex items-end justify-center gap-1 text-slate-900"><input type="number" step="0.01" class="table-input w-16 px-1 text-slate-800"><span class="text-[9px] text-gray-400">mm</span></div></td>`;

    tableBody.appendChild(row);
  });
}

function markFailure(kN) {
  document.getElementById("fail-load-result").value = kN;
  document.querySelectorAll("#bg-tableBody tr").forEach((row) => {
    if (row.cells[1].innerText.includes(`${kN} kN`)) {
      row.classList.add("fail-active");
    } else {
      row.classList.remove("fail-active");
    }
  });
}

function initAuszugsversuch() {
  const tbody = document.getElementById("bg-tableBody");
  if (tbody.children.length > 0) return;

  const levels = [10, 20, 30, 40, 50, 60, 70, 80];
  levels.forEach((val, index) => {
    const tr = document.createElement("tr");
    tr.id = `bg-row-${index}`;
    tr.className = "border-b border-gray-100 transition-all text-slate-800";
    tr.innerHTML = `
      <td class="p-3 border-r border-gray-100 font-bold text-gray-700">Stufe ${index + 1}</td>
      <td class="p-3 border-r border-gray-100 text-center font-mono text-blue-800 font-bold text-sm text-blue-900">${val} kN</td>
      <td class="p-3 border-r border-gray-100 text-center text-gray-600 font-bold cursor-pointer-hover" onclick="stopTimer('bg', ${index})">5 Min</td>
      <td class="p-3 border-r border-gray-100 text-center no-print">
        <div class="flex items-center justify-center gap-3 text-slate-900">
          <span id="bg-timer-display-${index}" class="font-mono font-black text-gray-800 text-sm w-12 text-slate-800">5:00</span>
          <button id="bg-timer-btn-${index}" onclick="toggleTimer('bg', ${index}, 5)" class="bg-blue-600 text-white text-[10px] px-3 py-1 rounded font-bold transition uppercase">Start</button>
        </div>
      </td>
      <td class="p-3 border-r border-gray-100"><div class="flex items-end justify-center gap-1 text-slate-900"><input type="number" step="0.01" class="table-input w-16 px-1 text-slate-800"><span class="text-[9px] text-gray-400">mm</span></div></td>
      <td class="p-3 border-r border-gray-100"><div class="flex items-end justify-center gap-1 text-slate-900"><input type="number" step="0.01" class="table-input w-16 px-1 text-slate-800"><span class="text-[9px] text-gray-400">mm</span></div></td>
      <td class="p-3 text-center no-print text-slate-900">
        <button onclick="markFailure(${val})" class="bg-red-50 text-red-600 text-[10px] font-black uppercase px-2 py-1 rounded border border-red-200 hover:bg-red-600 hover:text-white transition-all">Versagen</button>
      </td>`;

    tbody.appendChild(tr);
  });
}

function getText(selector) {
  const el = document.querySelector(selector);
  return (el ? ("value" in el ? el.value : el.textContent) : "").trim();
}

function getTableInput(row, columnIndex) {
  const cell = row.cells[columnIndex];
  if (!cell) return "";
  const input = cell.querySelector("input");
  return input ? input.value : cell.textContent.trim();
}

function collectProtocolPayload(moduleType) {
  const payload = {
    moduleType,
    capturedAt: new Date().toISOString(),
    masterData: {
      kunde: getText("#input-kunde"),
      projekt: getText("#input-projekt"),
      pruefer: getText("#input-kontakt"),
      email: getText("#input-email")
    },
    belastungspruefung: {
      datum: getText("#lb-date"),
      projekt: getText("#lb-display-projekt"),
      prueflastKn: getText("#maxForce"),
      rows: Array.from(document.querySelectorAll("#tableBody tr")).map((row) => ({
        stufe: row.cells[0]?.textContent.trim() || "",
        kn: row.cells[1]?.textContent.trim() || "",
        haltezeit: row.cells[2]?.textContent.trim() || "",
        wegLastaufbringung: getTableInput(row, 4),
        wegNachHaltezeit: getTableInput(row, 5)
      }))
    },
    drehmoment: {
      datum: getText("#torque-date"),
      pruefer: getText("#dt-prufer-input"),
      rows: Array.from(document.querySelectorAll("#torque-body tr")).map((row) => ({
        nr: row.cells[0]?.textContent.trim() || "",
        antrieb: row.querySelector(".gear-btn.active")?.dataset.gear || "schild",
        bar: row.querySelector(".bar-input")?.value || "",
        momentKnm: row.querySelector(".result-kNm")?.textContent.trim() || "",
        lastKn: row.querySelector(".result-kN")?.textContent.trim() || "",
        position: getTableInput(row, 5)
      }))
    },
    auszugsversuch: {
      datum: getText("#bg-date"),
      pruefer: getText("#bg-prufer-input"),
      versagenBeiKn: getText("#fail-load-result"),
      rows: Array.from(document.querySelectorAll("#bg-tableBody tr")).map((row) => ({
        stufe: row.cells[0]?.textContent.trim() || "",
        kn: row.cells[1]?.textContent.trim() || "",
        haltezeit: row.cells[2]?.textContent.trim() || "",
        wegLastaufbringung: getTableInput(row, 4),
        wegNachHaltezeit: getTableInput(row, 5)
      }))
    }
  };

  return payload;
}

async function persistProtocol(moduleType) {
  const payload = collectProtocolPayload(moduleType);

  setSyncStatus("Speicherung läuft", "progress");
  try {
    const response = await fetch("/api/protocols", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || "Speichern fehlgeschlagen");
    }

    const result = await response.json();
    if (result.drive?.uploaded) {
      setSyncStatus("in Google Drive gespeichert", "ok");
    } else {
      setSyncStatus("lokal gespeichert, Drive ausstehend", "warn");
    }
  } catch (error) {
    console.error("Speicherfehler:", error);
    setSyncStatus("Fehler bei Speicherung", "error");
  }
}

async function triggerExport(moduleType) {
  await persistProtocol(moduleType);
  window.print();
}

function showView(view) {
  document.querySelectorAll('[id^="view-"]').forEach((el) => el.classList.add("hidden"));
  document.getElementById(`view-${view}`).classList.remove("hidden");

  const currentProject = getText("#input-projekt") || "---";
  const currentPrufer = getText("#input-kontakt");
  const today = new Date().toISOString().split("T")[0];
  const dateStr = new Date().toLocaleDateString("de-DE");

  if (view === "drehmoment") {
    document.getElementById("dt-sync-info").textContent = `${getText("#input-kunde") || "---"} | ${currentProject}`;
    document.getElementById("dt-prufer-input").value = currentPrufer;
    if (!document.getElementById("torque-date").value) document.getElementById("torque-date").value = today;
    if (document.getElementById("torque-body").children.length === 0) {
      for (let i = 0; i < 3; i += 1) addTorqueRow();
    }
    document.getElementById("current-date-torque").textContent = dateStr;
    renderReferenceTable();
  }

  if (view === "belastungsversuch") {
    document.getElementById("lb-display-projekt").textContent = currentProject;
    if (!document.getElementById("lb-date").value) document.getElementById("lb-date").value = today;
    if (document.getElementById("tableBody").children.length === 0) calculateValues();
  }

  if (view === "bruchgrenze") {
    document.getElementById("bg-display-projekt").textContent = currentProject;
    document.getElementById("bg-prufer-input").value = currentPrufer;
    if (!document.getElementById("bg-date").value) document.getElementById("bg-date").value = today;
    document.getElementById("bg-current-date-footer").textContent = dateStr;
    initAuszugsversuch();
  }
}

function toggleReferenceTable(id) {
  document.getElementById(id).classList.toggle("hidden");
}

function renderReferenceTable() {
  const container = document.getElementById("ref-table-rows");
  container.innerHTML = "";
  Object.keys(TORQUE_LOOKUP_TABLE).forEach((bar) => {
    const data = TORQUE_LOOKUP_TABLE[bar];
    const div = document.createElement("div");
    div.className = "grid grid-cols-5 gap-2 py-1 border-b border-blue-800 text-white";
    div.innerHTML = `
      <span class="text-blue-200 font-bold">${bar}</span>
      <span>${data.hase || "-"}</span>
      <span>${data.haseForce || "-"}</span>
      <span>${data.schild || "-"}</span>
      <span class="text-blue-400 font-bold">${data.schildForce || "-"}</span>`;
    container.appendChild(div);
  });
}

function toggleModal(id, show) {
  document.getElementById(id).classList.toggle("hidden", !show);
}

function resetAllData() {
  window.location.reload();
}

window.toggleTimer = toggleTimer;
window.stopTimer = stopTimer;
window.addTorqueRow = addTorqueRow;
window.setGear = setGear;
window.calcTorque = calcTorque;
window.calculateValues = calculateValues;
window.markFailure = markFailure;
window.showView = showView;
window.toggleReferenceTable = toggleReferenceTable;
window.toggleModal = toggleModal;
window.resetAllData = resetAllData;
window.triggerExport = triggerExport;

window.addEventListener("DOMContentLoaded", () => {
  showView("dashboard");
});
