// ==========================================
// LOGICLORDS - DFA STRING PROCESSING VISUALIZER
// ==========================================

let dfa = { states: [], alphabet: [], startState: "", finalStates: [], transitions: {} };

const statesInput = document.getElementById("states");
const alphabetInput = document.getElementById("alphabet");
const startStateSelect = document.getElementById("startState");
const finalStatesInput = document.getElementById("finalStates");
const generateBtn = document.getElementById("generateBtn");
const transitionSection = document.getElementById("transitionSection");
const diagram = document.getElementById("diagram");
const inputString = document.getElementById("inputString");
const testBtn = document.getElementById("testBtn");
const resetBtn = document.getElementById("resetBtn");
const simulationSteps = document.getElementById("simulationSteps");
const result = document.getElementById("result");

const STEP_DELAY = 800; // ms between animation steps

function parseInput(value) {
    return value.split(",").map(s => s.trim()).filter(s => s !== "");
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ------------------------------------------
// Start state dropdown
// ------------------------------------------
statesInput.addEventListener("input", function () {
    const prev = startStateSelect.value;
    startStateSelect.innerHTML = '<option value="">Select start state</option>';
    parseInput(statesInput.value).forEach(state => {
        const o = document.createElement("option");
        o.value = state; o.textContent = state;
        startStateSelect.appendChild(o);
    });
    startStateSelect.value = prev;
});

// ------------------------------------------
// Generate transition table
// ------------------------------------------
generateBtn.addEventListener("click", function () {
    const states = parseInput(statesInput.value);
    const alphabet = parseInput(alphabetInput.value);
    const startState = startStateSelect.value;
    const finalStates = parseInput(finalStatesInput.value);

    if (states.length === 0 || alphabet.length === 0) return alert("Please enter states and alphabet.");
    if (new Set(states).size !== states.length) return alert("Duplicate states are not allowed.");
    if (new Set(alphabet).size !== alphabet.length) return alert("Duplicate alphabet symbols are not allowed.");
    if (alphabet.some(a => a.length !== 1)) return alert("Each input symbol must be a single character (e.g. 0, 1, a, b).");
    if (!startState || !states.includes(startState)) return alert("Please select a valid start state.");
    if (!finalStates.every(s => states.includes(s))) return alert("Final states must belong to the state set.");

    dfa = { states, alphabet, startState, finalStates, transitions: {} };

    let html = `
        <h3 style="margin-bottom:15px;">Transition Table</h3>
        <table class="transition-table">
            <thead><tr><th>Current State</th>${alphabet.map(s => `<th>Input ${esc(s)}</th>`).join("")}</tr></thead>
            <tbody>`;
    states.forEach(state => {
        html += `<tr><td>${esc(state)}${state === startState ? " → START" : ""}${finalStates.includes(state) ? " ★ FINAL" : ""}</td>`;
        alphabet.forEach(symbol => {
            html += `<td><select class="transition-select" data-state="${esc(state)}" data-symbol="${esc(symbol)}">
                <option value="">Select</option>
                ${states.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}
            </select></td>`;
        });
        html += "</tr>";
    });
    html += `</tbody></table>
        <p style="margin-top:12px;color:#64748b;">Select a destination state for every transition.</p>
        <button id="saveDfaBtn" class="primary-btn">Save Automaton & Generate Diagram</button>`;
    transitionSection.innerHTML = html;
    document.getElementById("saveDfaBtn").addEventListener("click", saveAutomaton);
});

// ------------------------------------------
// Save automaton
// ------------------------------------------
function saveAutomaton() {
    const transitions = {};
    for (const select of document.querySelectorAll(".transition-select")) {
        if (!select.value) return alert("Please complete every transition.");
        const { state, symbol } = select.dataset;
        (transitions[state] = transitions[state] || {})[symbol] = select.value;
    }
    dfa.transitions = transitions;
    generateDiagram();
    document.getElementById("visualization").scrollIntoView();
}

// ------------------------------------------
// SVG state diagram
// ------------------------------------------
function generateDiagram() {
    const st = dfa.states, n = st.length, r = 30;
    const W = Math.max(760, n * 150), H = n <= 2 ? 320 : 480;
    const cx = W / 2, cy = H / 2;
    const R = n === 1 ? 0 : n === 2 ? Math.min(W / 2 - 110, 200) : Math.min(W / 2 - 110, H / 2 - 90);

    const pos = st.map((_, i) => {
        const a = Math.PI + (2 * Math.PI * i) / n;
        return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a: n === 1 ? -Math.PI / 2 : a };
    });

    // merge symbols going between the same pair of states: "0,1"
    const edges = {};
    st.forEach((s, i) => dfa.alphabet.forEach(sym => {
        const j = st.indexOf(dfa.transitions[s][sym]);
        (edges[i + "|" + j] = edges[i + "|" + j] || []).push(sym);
    }));

    const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
    let paths = "", labels = "";

    Object.entries(edges).forEach(([key, syms]) => {
        const [i, j] = key.split("|").map(Number);
        const A = pos[i], B = pos[j], text = esc(syms.join(", "));
        let d, lx, ly;

        if (i === j) { // self loop
            const a = A.a, a1 = a - 0.5, a2 = a + 0.5;
            const p1 = [A.x + r * Math.cos(a1), A.y + r * Math.sin(a1)];
            const p2 = [A.x + r * Math.cos(a2), A.y + r * Math.sin(a2)];
            const c1 = [A.x + 2.6 * r * Math.cos(a - 0.7), A.y + 2.6 * r * Math.sin(a - 0.7)];
            const c2 = [A.x + 2.6 * r * Math.cos(a + 0.7), A.y + 2.6 * r * Math.sin(a + 0.7)];
            d = `M ${p1} C ${c1} ${c2} ${p2}`;
            lx = A.x + (1.9 * r + 12) * Math.cos(a);
            ly = A.y + (1.9 * r + 12) * Math.sin(a);
        } else {
            const [ux, uy] = unit(B.x - A.x, B.y - A.y);
            const px = -uy, py = ux;
            const rev = edges[j + "|" + i] ? 1 : 0, k = rev ? 30 : 0; // curve if both directions exist
            const C = [(A.x + B.x) / 2 + px * k * 2, (A.y + B.y) / 2 + py * k * 2];
            const [d1x, d1y] = unit(C[0] - A.x, C[1] - A.y);
            const [d2x, d2y] = unit(C[0] - B.x, C[1] - B.y);
            const S = [A.x + d1x * r, A.y + d1y * r], E = [B.x + d2x * r, B.y + d2y * r];
            d = `M ${S} Q ${C} ${E}`;
            const mx = 0.25 * A.x + 0.5 * C[0] + 0.25 * B.x, my = 0.25 * A.y + 0.5 * C[1] + 0.25 * B.y;
            const off = rev ? 16 : -14;
            lx = mx + px * off; ly = my + py * off;
        }
        paths += `<path id="e-${i}-${j}" class="dfa-edge" d="${d}" marker-end="url(#arrow)"/>`;
        labels += `<text class="edge-label" x="${lx}" y="${ly + 4}" text-anchor="middle">${text}</text>`;
    });

    let nodes = "";
    st.forEach((s, i) => {
        const p = pos[i], isFinal = dfa.finalStates.includes(s);
        nodes += `<circle id="node-${i}" class="dfa-state" cx="${p.x}" cy="${p.y}" r="${r}" fill="#fff" stroke="#142b4a" stroke-width="2.5"/>`;
        if (isFinal) nodes += `<circle cx="${p.x}" cy="${p.y}" r="${r - 6}" fill="none" stroke="#142b4a" stroke-width="2" pointer-events="none"/>`;
        nodes += `<text class="node-label" x="${p.x}" y="${p.y + 5}" text-anchor="middle">${esc(s)}</text>`;
    });

    // start arrow
    const si = st.indexOf(dfa.startState), sp = pos[si];
    const hasSelf = !!edges[si + "|" + si];
    const sa = hasSelf ? sp.a + 1.3 : sp.a;
    const sx1 = sp.x + (r + 55) * Math.cos(sa), sy1 = sp.y + (r + 55) * Math.sin(sa);
    const sx2 = sp.x + r * Math.cos(sa), sy2 = sp.y + r * Math.sin(sa);
    const startArrow = `<line class="dfa-edge" x1="${sx1}" y1="${sy1}" x2="${sx2}" y2="${sy2}" marker-end="url(#arrow)"/>
        <text class="edge-label" x="${sx1}" y="${sy1 - 6}" text-anchor="middle">START</text>`;

    diagram.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;display:block;margin:auto">
            <defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M0 0L10 5L0 10z" fill="#475569"/></marker></defs>
            ${paths}${startArrow}${nodes}${labels}
        </svg>
        <p style="text-align:center;margin-top:10px;color:#64748b;">
            Start: ${esc(dfa.startState)} | Final (double circle): ${esc(dfa.finalStates.join(", ") || "None")}
        </p>`;
}

// ------------------------------------------
// Highlight helpers
// ------------------------------------------
function clearHighlights() {
    document.querySelectorAll(".active-state").forEach(e => e.classList.remove("active-state"));
    document.querySelectorAll(".active-edge").forEach(e => e.classList.remove("active-edge"));
}
function highlightNode(name) {
    const el = document.getElementById("node-" + dfa.states.indexOf(name));
    if (el) el.classList.add("active-state");
}
function highlightEdge(from, to) {
    const el = document.getElementById(`e-${dfa.states.indexOf(from)}-${dfa.states.indexOf(to)}`);
    if (el) el.classList.add("active-edge");
}

// Pure DFA run (used by test cases)
function runDfa(str) {
    let cur = dfa.startState;
    for (const c of str) {
        if (!dfa.alphabet.includes(c)) return { valid: false, symbol: c };
        cur = dfa.transitions[cur][c];
    }
    return { valid: true, accepted: dfa.finalStates.includes(cur), finalState: cur };
}

// ------------------------------------------
// Animated string test
// ------------------------------------------
let running = false;

testBtn.addEventListener("click", async function () {
    if (running) return;
    if (Object.keys(dfa.transitions).length === 0) return alert("Please configure and save your DFA first.");

    const str = inputString.value.trim();
    const check = runDfa(str);
    if (!check.valid) {
        simulationSteps.innerHTML = "";
        result.innerHTML = `<div class="result-rejected">Invalid symbol "${esc(check.symbol)}" – not in the alphabet</div>`;
        return;
    }

    running = true; testBtn.disabled = true;
    clearHighlights(); result.innerHTML = "";
    simulationSteps.innerHTML = `<h3>Simulation Steps</h3>
        <table class="transition-table"><thead><tr><th>Step</th><th>Input Symbol</th><th>Current State</th><th>Next State</th></tr></thead>
        <tbody id="simBody"></tbody></table>`;
    const body = document.getElementById("simBody");
    const addRow = (a, b, c, d) => {
        const tr = document.createElement("tr");
        tr.className = "animated-row";
        tr.innerHTML = `<td>${a}</td><td>${esc(b)}</td><td>${esc(c)}</td><td>${esc(d)}</td>`;
        body.appendChild(tr);
    };

    let cur = dfa.startState;
    highlightNode(cur);
    addRow(0, "START", "-", cur);
    await sleep(STEP_DELAY);

    for (let i = 0; i < str.length; i++) {
        const sym = str[i], next = dfa.transitions[cur][sym];
        clearHighlights(); highlightNode(cur); highlightEdge(cur, next);   // show the path being taken
        await sleep(STEP_DELAY / 2);
        clearHighlights(); highlightNode(next);                            // move to next state
        addRow(i + 1, sym, cur, next);
        cur = next;
        await sleep(STEP_DELAY);
    }

    const accepted = dfa.finalStates.includes(cur);
    result.innerHTML = `<div class="${accepted ? "result-accepted" : "result-rejected"}">
        ${accepted ? "✓ STRING ACCEPTED" : "✕ STRING REJECTED"}
        <p>Final State: ${esc(cur)}${str === "" ? " (empty string ε)" : ""}</p></div>`;
    running = false; testBtn.disabled = false;
});

resetBtn.addEventListener("click", function () {
    if (running) return;
    inputString.value = ""; simulationSteps.innerHTML = ""; result.innerHTML = "";
    clearHighlights();
});

// ------------------------------------------
// Test cases: expected vs actual (needs #tcInput, #tcExpected, #addTcBtn, #runAllBtn, #tcResults)
// ------------------------------------------
const testCases = [];
const tcResults = document.getElementById("tcResults");

function renderTestCases(run) {
    if (!tcResults) return;
    if (!testCases.length) { tcResults.innerHTML = ""; return; }
    let html = `<table class="transition-table"><thead><tr><th>#</th><th>Input</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead><tbody>`;
    testCases.forEach((t, i) => {
        let actual = "-", status = "-";
        if (run) {
            const r = runDfa(t.input);
            actual = !r.valid ? "Invalid" : r.accepted ? "Accept" : "Reject";
            status = actual.toLowerCase() === t.expected ? "✅ PASS" : "❌ FAIL";
        }
        html += `<tr><td>${i + 1}</td><td>${t.input === "" ? "ε (empty)" : esc(t.input)}</td><td>${t.expected}</td><td>${actual}</td><td>${status}</td></tr>`;
    });
    tcResults.innerHTML = html + "</tbody></table>";
}

if (document.getElementById("addTcBtn")) {
    document.getElementById("addTcBtn").addEventListener("click", () => {
        testCases.push({ input: document.getElementById("tcInput").value.trim(), expected: document.getElementById("tcExpected").value });
        document.getElementById("tcInput").value = "";
        renderTestCases(false);
    });
    document.getElementById("runAllBtn").addEventListener("click", () => {
        if (Object.keys(dfa.transitions).length === 0) return alert("Please configure and save your DFA first.");
        renderTestCases(true);
    });
}
