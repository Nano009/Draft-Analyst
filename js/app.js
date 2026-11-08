function renderReport() {
  const b = profile("blue");
  const r = profile("red");

  const metrics = p => `
    <div class="metric-row">
      <span class="metric">Tank tags: ${p.tanks}</span>
      <span class="metric">Mage tags: ${p.mages}</span>
      <span class="metric">Marksman tags: ${p.marksmen}</span>
      <span class="metric">Assassin tags: ${p.assassins}</span>
    </div>`;

  $("report").className = "";
  $("report").innerHTML = `
    <div class="report-grid">
      ${professionalStatsCard(b, r)}
      ${professionalMatchupSynergyCard(b, r)}
      ${draftEvidenceInsights(b, r)}
      ${card("&#128309; Blue side", metrics(b) + `
        <h4>Composition read</h4>
        <ul>${compRead(b).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <h4>Possible win conditions</h4>
        <ul>${conditions(b).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      `)}

      ${card("&#128308; Red side", metrics(r) + `
        <h4>Composition read</h4>
        <ul>${compRead(r).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <h4>Possible win conditions</h4>
        <ul>${conditions(r).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      `)}

      ${card("Draft comparison", `
        <ul>${compare(b, r).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <h4>Before the match</h4>
        <p>Identify reliable engage, answers to dive, and which objective setup gives your composition room to operate.</p>
      `)}

      ${card("Game-phase comparison", phaseAnalysis(b, r))}
      ${draftIdentityAnalysis(b, r)}

      ${card("Potential lane counters and interactions", `
        <p>These are possible archetype interactions inferred from champion tags, not confirmed counter statistics.</p>
        <ul>${counterAnalysis()}</ul>
      `)}

      ${card("Lane matchup checklist", `<ul>${laneReview()}</ul>`)}
    </div>

    ${teamCompositionAnalysis(b, r)}
    ${objectiveAnalysis(b, r)}
  `;
}

async function loadProfessionalStats() {
  const statsPicker = $("proStatsFile");
  const status = $("statsUploadStatus");

  if (statsPicker && !statsPicker.dataset.listenerAttached) {
    statsPicker.dataset.listenerAttached = "true";

    statsPicker.addEventListener("change", async () => {
      const file = statsPicker.files?.[0];
      if (!file) return;

      try {
        const data = JSON.parse(await file.text());

        if (!data || !data.patches ||
            typeof data.patches !== "object") {
          throw new Error("Invalid stats JSON format.");
        }

        professionalStats = data;
        professionalStatsError = "";

        if (status) {
          status.textContent = "Statistics loaded: " + file.name;
        }

        if ($("report").className !== "report-empty") {
          renderReport();
        }
      } catch (error) {
        if (status) {
          status.textContent = "Could not load file: " + error.message;
        }
      }
    });
  }

  try {
    if (window.leagueLive &&
        typeof window.leagueLive.getProStats === "function") {

      professionalStats = await window.leagueLive.getProStats();

      if (status) {
        status.textContent = "Professional statistics loaded from Electron.";
      }

    } else {
      const response = await fetch("data/pro_stats.json");

      if (!response.ok) {
        throw new Error("Automatic statistics file unavailable.");
      }

      const data = await response.json();

      if (!data || !data.patches ||
          typeof data.patches !== "object") {
        throw new Error("Invalid statistics JSON format.");
      }

      professionalStats = data;

      if (status) {
        status.textContent = "Professional statistics loaded automatically.";
      }
    }

    professionalStatsError = "";

  } catch (error) {
    professionalStats = null;

    professionalStatsError =
      "Professional statistics unavailable. Please select your JSON file.";

    if (status) {
      status.textContent =
        "Automatic loading unavailable. Choose your professional stats JSON file.";
    }

    console.warn("Could not load professional statistics:", error);
  }

  if ($("report").className !== "report-empty") {
    renderReport();
  }
}

async function loadChampions() {
  makeSlots();

  try {
    const vr = await fetch(
      "https://ddragon.leagueoflegends.com/api/versions.json"
    );

    if (!vr.ok) throw Error("version list unavailable");

    version = (await vr.json())[0];

    const dr = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
    );

    if (!dr.ok) throw Error("champion list unavailable");

    champions = Object.values((await dr.json()).data);
    fillSelects();

    $("loadStatus").textContent =
      `${champions.length} champions loaded  |  Data Dragon ${version}`;

    $("loadStatus").classList.add("good");
  } catch (e) {
    $("loadStatus").textContent = "Champion data unavailable";
    $("loadStatus").classList.add("danger");
    $("report").className = "report-empty";
    $("report").textContent =
      "Could not load champion data. Check your internet connection and reopen Draft Analyst. No API key is required.";
  }
}

$("analyseBtn").addEventListener("click", renderReport);
loadProfessionalStats();

$("resetBtn").addEventListener("click", () => {
  for (const side of ["blue", "red"]) {
    teams[side] = {};

    document
      .querySelectorAll(`select[data-side="${side}"]`)
      .forEach(s => s.value = "");
document
  .querySelectorAll(`.slot select[data-side="${side}"]`)
  .forEach(select => {
    const slot = select.closest(".slot");
    const search = slot?.querySelector(".champion-search");
    if (search) search.value = "";
  });
    ROLES.forEach(r => updateSlot(side, r.key));
    updateTeamSummary(side);updateTeamProgress(side);
  }

  refreshChampionAvailability();

  $("report").className = "report-empty";
  $("report").innerHTML =
    'Select champions for both teams, then choose <strong>Analyse draft</strong>.';
});

loadChampions().then(() => enableChampionSearch());


// Make each champion selector a single searchable dropdown.
function enableChampionSearch() {
  document.querySelectorAll(".slot").forEach(slot => {
    const search = slot.querySelector(".champion-search");
    const select = slot.querySelector("select");

    if (!search || !select || search.dataset.enabled) return;
    search.dataset.enabled = "true";

    // Keep the real select hidden in the background so the existing draft
    // analysis and champion-change logic continue to work unchanged.
    select.style.display = "none";
    search.setAttribute("autocomplete", "off");
    search.setAttribute("aria-label", "Search and select a champion");
    search.setAttribute("role", "combobox");
    search.setAttribute("aria-expanded", "false");

    const list = document.createElement("div");
    list.className = "champion-search-results";
    list.style.cssText = [
      "display:none",
      "position:absolute",
      "top:calc(100% + 4px)",
      "left:0",
      "right:0",
      "max-height:240px",
      "overflow-y:auto",
      "z-index:1000",
      "padding:4px",
      "background:#111827",
      "border:1px solid #35415a",
      "border-radius:8px",
      "box-shadow:0 10px 28px rgba(0,0,0,.4)"
    ].join(";");

    // Wrap the input so the results panel opens directly beneath it.
    const searchWrap = document.createElement("div");
    searchWrap.style.cssText = "position:relative;width:100%;";
    search.parentNode.insertBefore(searchWrap, search);
    searchWrap.appendChild(search);
    searchWrap.appendChild(list);

    function closeList() {
      list.style.display = "none";
      search.setAttribute("aria-expanded", "false");
    }

    function showList() {
      list.style.display = "block";
      search.setAttribute("aria-expanded", "true");
    }

    function renderMatches() {
      const query = search.value.trim().toLowerCase();
      const matches = [...champions]
        .filter(champion => {
          const selectedElsewhere = Object.entries(teams).some(([sideName, sidePicks]) =>
            Object.entries(sidePicks).some(([roleName, id]) =>
              id === champion.id &&
              !(sideName === slot.dataset.side && roleName === slot.dataset.role)
            )
          );

          return !selectedElsewhere &&
            champion.name.toLowerCase().includes(query);
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      list.replaceChildren();

      if (!matches.length) {
        const empty = document.createElement("div");
        empty.textContent = "No matching champions";
        empty.style.cssText = "padding:9px 10px;color:#9aa6bd;font-size:12px;";
        list.appendChild(empty);
      } else {
        matches.forEach(champion => {
          const option = document.createElement("button");
          option.type = "button";
          option.textContent = champion.name;
          option.style.cssText = [
            "display:block",
            "width:100%",
            "padding:9px 10px",
            "border:0",
            "border-radius:5px",
            "background:transparent",
            "color:#eef2ff",
            "text-align:left",
            "font:inherit",
            "font-size:12px",
            "cursor:pointer"
          ].join(";");

          option.addEventListener("mouseenter", () => {
            option.style.background = "#273449";
          });
          option.addEventListener("mouseleave", () => {
            option.style.background = "transparent";
          });
          option.addEventListener("mousedown", event => {
            // Keep focus on the input until the selection has been applied.
            event.preventDefault();
          });
          option.addEventListener("click", () => {
            search.value = champion.name;
            select.value = champion.id;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            closeList();
          });
          list.appendChild(option);
        });
      }

      showList();
    }

    search.addEventListener("focus", renderMatches);
    search.addEventListener("click", renderMatches);
    search.addEventListener("input", () => {
      // Typing a different name clears the previous selection until a result
      // is clicked, preventing the displayed text and selected champion
      // from getting out of sync.
      const selected = champions.find(champion => champion.id === select.value);
      if (selected && search.value.trim() !== selected.name) {
        select.value = "";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      renderMatches();
    });

    search.addEventListener("keydown", event => {
      if (event.key === "Escape") closeList();
      if (event.key === "Enter") {
        const firstOption = list.querySelector("button");
        if (firstOption && list.style.display !== "none") {
          event.preventDefault();
          firstOption.click();
        }
      }
    });

    document.addEventListener("click", event => {
      if (!slot.contains(event.target)) closeList();
    });
  });
}
