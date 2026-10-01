"use strict";
const DECISIONS = ["F+", "RFI", "PM", "T+", "AOC"];
const POST_DECISIONS = ["F+", "PM", "closure", "disablement", "escalation", "RFI"];
const KEY = "caseDashboard.v1";
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let cases = [];
try { cases = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { cases = []; }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(cases)); } catch (e) { say("Could not save to browser storage.", true); } };

// Reads "Decision: X | Post: Y" from the first line of the annotation.
function pick(line, label, allowed) {
  const m = line.match(new RegExp("(?:^|[|,;]\\s*)" + label + "\\s*[:=]\\s*([^|,;]+)", "i"));
  if (!m) return "";
  const v = m[1].trim().toLowerCase();
  return allowed.find(a => a.toLowerCase() === v) || "";
}
function parseHeader(text) {
  const line = text.split("\n")[0];
  return { decision: pick(line, "decision", DECISIONS), post: pick(line, "post(?:-decision)?", POST_DECISIONS) };
}

function say(text, bad) { const m = $("msg"); m.textContent = text; m.className = bad ? "err" : "good"; }
function validUrl(u) { try { const p = new URL(u).protocol; return p === "http:" || p === "https:"; } catch (e) { return false; } }
const fmt = iso => new Date(iso).toLocaleString();

function tick() { $("when").value = new Date().toLocaleString(); }
function syncHeader() { const h = parseHeader($("ann").value); $("dec").value = h.decision; $("post").value = h.post; }

function visible() {
  const q = $("q").value.toLowerCase(), f = $("flt").value;
  return cases.filter(c => (!f || c.decision === f) && (c.caseId + " " + c.annotation).toLowerCase().includes(q));
}
function render() {
  const today = new Date().toDateString();
  const counts = DECISIONS.map(d => `<div class="chip"><b>${cases.filter(c => c.decision === d).length}</b>${esc(d)}</div>`).join("");
  $("stats").innerHTML = `<div class="chip"><b>${cases.length}</b>Total</div><div class="chip"><b>${cases.filter(c => new Date(c.createdAt).toDateString() === today).length}</b>Today</div>` + counts;
  const rows = visible();
  $("rows").innerHTML = rows.length ? rows.map(c =>
    `<tr><td><a href="${esc(c.caseUrl)}" target="_blank" rel="noopener noreferrer">${esc(c.caseId)}</a></td><td>${fmt(c.createdAt)}</td>` +
    `<td><span class="tag">${esc(c.decision)}</span></td><td><span class="tag">${esc(c.post)}</span></td>` +
    `<td class="note">${esc(c.annotation)}</td><td><button class="btn ghost sm" data-del="${esc(c.id)}">Delete</button></td></tr>`
  ).join("") : `<tr><td colspan="6">No cases yet.</td></tr>`;
}

$("f").addEventListener("submit", e => {
  e.preventDefault();
  const caseId = $("cid").value.trim(), caseUrl = $("url").value.trim(), annotation = $("ann").value.trim();
  const h = parseHeader(annotation);
  if (!caseId) return say("Enter a case ID.", true);
  if (cases.some(c => c.caseId.toLowerCase() === caseId.toLowerCase())) return say("That case ID already exists.", true);
  if (!validUrl(caseUrl)) return say("Enter a valid http(s) case URL.", true);
  if (!h.decision) return say("Header needs a valid Decision: " + DECISIONS.join(", "), true);
  if (!h.post) return say("Header needs a valid Post-decision: " + POST_DECISIONS.join(", "), true);
  cases.unshift({ id: String(Date.now()), caseId, caseUrl, createdAt: new Date().toISOString(), annotation, decision: h.decision, post: h.post });
  persist(); $("f").reset(); syncHeader(); render(); say("Saved " + caseId + ".");
});
$("ann").addEventListener("input", syncHeader);
$("tpl").onclick = () => { const a = $("ann"); if (!/^decision/i.test(a.value)) a.value = "Decision:  | Post: \n" + a.value; a.focus(); };
$("q").addEventListener("input", render);
$("flt").addEventListener("change", render);
$("rows").addEventListener("click", e => {
  const id = e.target.dataset.del;
  if (id && confirm("Delete this case?")) { cases = cases.filter(c => c.id !== id); persist(); render(); }
});
$("csv").onclick = () => {
  const cell = v => { v = String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const lines = [["Case ID", "Case URL", "Date/time", "Decision", "Post-decision", "Annotation"]].concat(
    visible().map(c => [c.caseId, c.caseUrl, c.createdAt, c.decision, c.post, c.annotation]));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.map(r => r.map(cell).join(",")).join("\n")], { type: "text/csv" }));
  a.download = "cases.csv"; a.click(); URL.revokeObjectURL(a.href);
};

$("flt").innerHTML = '<option value="">All decisions</option>' + DECISIONS.map(d => `<option>${esc(d)}</option>`).join("");
tick(); setInterval(tick, 1000); syncHeader(); render();
