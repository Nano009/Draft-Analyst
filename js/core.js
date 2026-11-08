const ROLES=[{key:"top",label:"TOP"},{key:"jungle",label:"JUNGLE"},{key:"mid",label:"MID"},{key:"bot",label:"BOT / ADC"},{key:"support",label:"SUPPORT"}];
const teams={blue:{},red:{}};let champions=[],version="";
let professionalStats = null;
let professionalStatsError = "";const $=id=>document.getElementById(id);const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function updateTeamProgress(side) {
  const root = $(side + "Slots");
  const panel = root && root.closest(".team-panel");
  const heading = panel && panel.querySelector(".team-heading");
  if (!heading) return;

  let badge = heading.querySelector(".team-progress");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "team-progress";
    badge.setAttribute("aria-live", "polite");
    heading.appendChild(badge);
  }

  const count = Object.values(teams[side]).filter(Boolean).length;
  badge.textContent = count + " / 5 PICKS";
  badge.classList.toggle("team-progress-complete", count === 5);
}
function makeSlots(){for(const side of ["blue","red"]){const root=$(side+"Slots");root.innerHTML="";for(const role of ROLES){const node=$("slotTemplate").content.cloneNode(true);node.querySelector(".slot").dataset.side=side;node.querySelector(".slot").dataset.role=role.key;node.querySelector("label").textContent=role.label;const select=node.querySelector("select");select.dataset.side=side;select.dataset.role=role.key;select.addEventListener("change",()=>{teams[side][role.key]=select.value||"";updateSlot(side,role.key);refreshChampionAvailability();updateTeamSummary(side);updateTeamProgress(side);$("report").className="report-empty";$("report").innerHTML='Draft changed. Select <strong>Analyse draft</strong> to refresh the report.'});root.appendChild(node)}updateTeamProgress(side)}}
function updateSlot(side,role){const slot=document.querySelector(`.slot[data-side="${side}"][data-role="${role}"]`);const id=teams[side][role],champ=champions.find(c=>c.id===id),img=slot.querySelector("img"),tags=slot.querySelector(".champion-tags");if(champ){img.src=`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.image.full}`;img.alt=champ.name;img.hidden=false;tags.innerHTML=champ.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join("")}else{img.hidden=true;img.removeAttribute("src");tags.innerHTML=""}}
function refreshChampionAvailability() {
  const used = new Set(
    Object.values(teams)
      .flatMap(side => Object.values(side))
      .filter(Boolean)
  );

  document.querySelectorAll(".slot select").forEach(select => {
    const current = select.value;

    Array.from(select.options).forEach(option => {
      if (!option.value) return;
      option.disabled = used.has(option.value) && option.value !== current;
    });
  });
}
function fillSelects(){const sorted=[...champions].sort((a,b)=>a.name.localeCompare(b.name));document.querySelectorAll(".slot select").forEach(s=>s.innerHTML='<option value="">Select champion</option>'+sorted.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(""))}
function picked(side){return ROLES.map(r=>({...r,champion:champions.find(c=>c.id===teams[side][r.key])})).filter(x=>x.champion)}
function updateTeamSummary(side){const list=picked(side),root=$(side+"Summary");if(!list.length){root.textContent="Choose champions to build your composition.";return}const counts={};list.flatMap(x=>x.champion.tags).forEach(t=>counts[t]=(counts[t]||0)+1);root.innerHTML=`<strong>${list.length}/5 selected</strong>  |  ${Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t,n])=>esc(t)+"  x "+n).join("  |  ")}`}
function profile(side){const list=picked(side),tags=list.flatMap(x=>x.champion.tags),count=t=>tags.filter(x=>x===t).length;return{list,count,tanks:count("Tank"),fighters:count("Fighter"),mages:count("Mage"),marksmen:count("Marksman"),assassins:count("Assassin"),supports:count("Support")}}
function compRead(p){const n=[];if(p.list.length<5)n.push(`Only ${p.list.length}/5 champions selected; complete the draft for a fuller read.`);if(p.tanks>=2||(p.tanks>=1&&p.supports>=1))n.push("Potential frontline: coordinate engage and protect carries during extended fights.");else n.push("Frontline may be limited: avoid committing without a clear engage, exit, or peel plan.");if(p.assassins>=2)n.push("Multiple Assassin tags suggest pick and backline-access potential; avoid prolonged front-to-back fights when possible.");if(p.marksmen>=1&&p.mages>=1)n.push("Mixed physical and magic damage tags may complicate opponents' defensive itemisation defensive itemisation.");else if(p.marksmen>=2)n.push("Physical-damage leaning draft: check whether opponents can stack armour comfortably.");else if(p.mages>=2)n.push("Magic-damage leaning draft: check whether opponents can stack magic resistance comfortably.");if(p.fighters>=2)n.push("Several Fighter tags may support skirmishes and side-lane pressure, depending on individual kits.");if(p.list.length===5&&p.tanks===0)n.push("No champion is tagged Tank: check who can start fights or absorb pressure.");return n}
function conditions(p){const out=[];if(p.assassins)out.push("Create numbers advantages through vision, picks and flanks before committing to objectives.");if(p.tanks)out.push("Coordinate engage around enemy positioning; avoid spending every control tool on the first target.");if(p.marksmen)out.push("Protect sustained-damage sources and consider front-to-back positioning against dive.");if(p.mages)out.push("Use range, wave control and area damage to shape objective approaches.");if(p.fighters)out.push("Look for skirmishes and side-lane pressure suited to your champions' kits.");return out.length?out.slice(0,4):["Complete more of the draft to generate useful win-condition prompts."]}
function compare(b,r){const a=[];if(b.tanks>r.tanks)a.push("Blue has more Tank-tagged champions, suggesting more potential frontline.");else if(r.tanks>b.tanks)a.push("Red has more Tank-tagged champions, suggesting more potential frontline.");if(b.assassins>r.assassins)a.push("Blue has more Assassin-tagged picks and may have more backline-access threat.");else if(r.assassins>b.assassins)a.push("Red has more Assassin-tagged picks and may have more backline-access threat.");if(b.marksmen+b.mages>r.marksmen+r.mages)a.push("Blue has more Mage/Marksman tags; assess whether its carries have enough protection.");else if(r.marksmen+r.mages>b.marksmen+b.mages)a.push("Red has more Mage/Marksman tags; assess whether its carries have enough protection.");return a.length?a:["Broad tags do not show a clear composition difference. Review champion-specific range, engage, disengage and ultimate interactions."]}
function laneReview() {
    const advice = {
        top: "Check trading patterns, all-in threat, sustain and wave control.",
        jungle: "Compare clear speed, gank setup, skirmishing and objective access.",
        mid: "Check wave clear, range, crowd control and opportunities to roam.",
        bot: "Compare range, wave pressure, sustained damage and vulnerability to engage.",
        support: "Compare engage, poke, peel, roaming and protection for the ADC."
    };

    return ROLES.map(role => {
        const blue = champions.find(
            c => c.id === teams.blue[role.key]
        );
        const red = champions.find(
            c => c.id === teams.red[role.key]
        );

        if (!blue || !red) {
            return `<li><strong>${esc(role.label)}:</strong>
                Select both champions to review this lane.</li>`;
        }

        return `
          <li>
            <strong>${esc(role.label)} - ${esc(blue.name)}
            vs ${esc(red.name)}:</strong>
            ${advice[role.key]}
            <em> These are review criteria, not verified matchup results.</em>
          </li>`;
    }).join("");
}let reportCardId = 0;
function card(title, content) {
  const panelId = `report-section-${++reportCardId}`;
  return `<article class="report-card report-collapsible">
    <div class="report-card-heading">
      <h3>${title}</h3>
      <button class="secondary report-toggle" type="button"
        data-report-toggle aria-expanded="false" aria-controls="${panelId}">
        Show more <span class="report-toggle-icon" aria-hidden="true">⌄</span>
      </button>
    </div>
    <div class="report-card-content" id="${panelId}" hidden>${content}</div>
  </article>`;
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-report-toggle]");
  if (!button) return;

  const panel = document.getElementById(button.getAttribute("aria-controls"));
  if (!panel) return;

  const expanded = button.getAttribute("aria-expanded") === "true";
  button.setAttribute("aria-expanded", String(!expanded));
  panel.hidden = expanded;
  button.firstChild.textContent = expanded ? "Show more " : "Show less ";
  const icon = button.querySelector(".report-toggle-icon");
  if (icon) icon.textContent = expanded ? "⌄" : "⌃";
});

function rolePick(p, key) {
  const entry = p.list.find(x => x.key === key);
  return entry ? entry.champion.name : "";
}

function namedRole(p, key, fallback) {
  const name = rolePick(p, key);
  return name ? `${name} (${key})` : fallback;
}

function objectiveSideRead(p, enemy, side, objective) {
  const roles = new Set(p.list.map(x => x.key));
  const names = p.list.map(x => x.champion.name);
  const tanks = p.tanks;
  const fighters = p.fighters;
  const marksmen = p.marksmen;
  const mages = p.mages;
  const assassins = p.assassins;
  const jungler = rolePick(p, "jungle");
  const mid = rolePick(p, "mid");
  const top = rolePick(p, "top");
  const bot = rolePick(p, "bot");
  const support = rolePick(p, "support");
  const frontline = tanks >= 1 || fighters >= 2;
  const enemyFrontline = enemy.tanks >= 1 || enemy.fighters >= 2;
  const damage = marksmen >= 1 || mages >= 1 || fighters >= 2;
  const enemyDamage = enemy.marksmen >= 1 || enemy.mages >= 1 || enemy.fighters >= 2;
  const roleSetup = roles.has("jungle") && roles.has("mid") && roles.has("support");
  const enemySide = side === "Blue" ? "Red" : "Blue";
  let advice = "";

  if (!p.list.length) {
    return `<p><strong>${side}:</strong> No champions selected yet, so objective advice cannot be tailored to this side.</p>`;
  }

  if (objective === "Dragon") {
    const pieces = [];
    if (jungler) pieces.push(`${jungler} is your selected jungler`);
    if (mid) pieces.push(`${mid} can be part of your mid-lane setup`);
    if (support) pieces.push(`${support} is your support for river vision and team coordination`);
    advice = pieces.length
      ? `${pieces.join("; ")}. Set up vision before the spawn and check bot/mid wave states before committing.`
      : "Your draft is incomplete around the usual dragon setup; avoid starting without checking nearby lane priority and enemy positions.";
    if (frontline && damage) advice += ` Your tags show ${tanks} Tank, ${fighters} Fighter, ${marksmen} Marksman and ${mages} Mage pick(s), which may give you tools to contest if your team arrives together.`;
    else advice += " Your current tag mix does not clearly show both a frontline and damage core, so contest only with a numbers or positioning advantage.";
  } else if (objective === "Dragon Soul") {
    advice = p.list.length < 5
      ? "Complete the draft before making a strong Soul-fight judgement. For now, coordinate arrival and avoid entering the river in separate groups."
      : (assassins > 0
        ? `Your ${names.filter(n => champions.find(c => c.name === n)?.tags.includes("Assassin")).slice(0, 2).join(" and ") || "Assassin-tagged pick(s)"} may offer pick or flank options before the Soul fight. Look for an isolated target, but do not assume a pick is available against a grouped ${enemySide} team.`
        : `Plan the Soul fight around ${mid || "your mid laner"} and ${support || "your support"}: decide who starts the fight, who protects carries, and how ${bot || "your bot laner"} can deal damage safely.`);
    if (enemyFrontline && !frontline) advice += " The opposing draft has a stronger Tank/Fighter-tagged frontline by this simple tag check; avoid a straight front-to-back fight unless you have another advantage.";
    else if (frontline && !enemyFrontline) advice += " Your Tank/Fighter tags suggest a possible frontline advantage, but actual engage and peel depend on champion abilities.";
  } else if (objective === "Void Grubs") {
    advice = top && mid
      ? `${top} (top) and ${mid} (mid) are your selected laners around the Grubs setup. Check both wave states and whether ${jungler || "your jungler"} can arrive first; only then decide whether to start or trade.`
      : `Your top/mid setup is incomplete (${top || "top not selected"}; ${mid || "mid not selected"}). Avoid forcing Grubs without nearby lane support; consider trading for Dragon, camps or vision.`;
    if (fighters >= 2) advice += " Your multiple Fighter tags may support skirmishing, but tags alone do not establish lane priority.";
  } else if (objective === "Rift Herald") {
    advice = `${top || "Your top laner"} and ${jungler || "your jungler"} are the key selected picks to plan around. Choose a lane where your team can push safely, prepare the wave, and decide which tower ${side} wants Herald to pressure.`;
    if (fighters > 0 || tanks > 0) advice += ` Your draft has ${fighters} Fighter and ${tanks} Tank tag(s), which may help with a contest depending on the actual kits and lane states.`;
    else advice += " Your tag profile has no Tank and no Fighter, so be especially careful about starting when the enemy can engage on you.";
  } else if (objective === "Baron") {
    advice = `${jungler || "Your jungler"} should coordinate the Baron call with ${mid || "your mid laner"} and ${support || "your support"}; control entrances and track enemy movement before starting.`;
    if (frontline && damage) advice += ` Your tag mix (${tanks} Tank, ${fighters} Fighter, ${marksmen} Marksman, ${mages} Mage) suggests some frontline and damage tools for a setup.`;
    else advice += " Your current tags do not clearly indicate both frontline and damage for a safe start; consider baiting a fight or securing a pick instead.";
    if (enemyDamage && !damage) advice += ` ${enemySide} has a clearer damage-tag profile in this comparison, so avoid a prolonged Baron attempt without checking your actual damage speed.`;
  }

  const enemyCounts = `${enemy.tanks} Tank, ${enemy.fighters} Fighter, ${enemy.marksmen} Marksman, ${enemy.mages} Mage and ${enemy.assassins} Assassin tag(s)`;
  return `<p><strong>${side} draft:</strong> ${p.list.length}/5 selected — ${names.join(", ")}.</p><p>${advice}</p><p class="objective-context"><strong>Matchup context:</strong> ${enemySide} has ${enemy.list.length}/5 selected and ${enemyCounts}. This comparison uses Data Dragon champion tags and role slots, not ability-level or live-game data.</p>`;
}

function objectiveCard(title, description, blue, red, call) {
  if (title === "Elemental Soul Considerations") {
    return card(title, `
      <p>${description}</p>
      <div class="soul-team-comparison">
        <section class="soul-team-column soul-team-blue">
          <h4 class="soul-team-title">🔵 Blue side</h4>
          ${blue}
        </section>
        <section class="soul-team-column soul-team-red">
          <h4 class="soul-team-title">🔴 Red side</h4>
          ${red}
        </section>
      </div>
      <h4>Strategic call</h4><p>${call}</p>
    `);
  }

  return card(title, `
    <p>${description}</p>
    <h4>Blue side</h4>${blue}
    <h4>Red side</h4>${red}
    <h4>Strategic call</h4><p>${call}</p>
  `);
}

// Curated champion-playstyle hints for Soul synergy.
// These are strategic heuristics, not measured win-rate advantages.
const SOUL_GUIDANCE = {
  Infernal: {
    champions: ["Kennen","Miss Fortune","Orianna","Rumble","Amumu","Diana","Wukong","Malphite","Neeko","Seraphine","Hwei","Brand","Zyra","Lillia","Fiddlesticks","Karthus","Viktor"],
    tags: ["Mage","Marksman"],
    reason: "Often a useful fit for compositions that can apply damage across grouped fights or threaten several targets."
  },
  Mountain: {
    champions: ["Ornn","Sion","K'Sante","Maokai","Sejuani","Zac","Leona","Braum","Alistar","Rell","Nautilus","Poppy","Shen","Tahm Kench","Taric","Galio","Skarner"],
    tags: ["Tank"],
    reason: "Can complement teams built around a durable frontline, controlled engagement and surviving the enemy's response."
  },
  Ocean: {
    champions: ["Aatrox","Briar","Swain","Vladimir","Sylas","Warwick","Olaf","Darius","Gwen","Dr. Mundo","Soraka","Nami","Sona","Taric","Renata Glasc","Milio"],
    tags: ["Fighter","Support","Tank"],
    reason: "May suit compositions that can remain in combat, recover or protect teammates through extended fights."
  },
  Cloud: {
    champions: ["Hecarim","Rakan","Kennen","Malphite","Nocturne","Vi","Jarvan IV","Ashe","Sejuani","Wukong","Galio","Rumble","K'Sante","Rell","Riven","Akali","Zed","Talon","Lillia"],
    tags: ["Assassin","Fighter"],
    reason: "Can complement engage, chase, repositioning or disengage plans; actual value depends on each champion's kit."
  },
  Hextech: {
    champions: ["Ashe","Seraphine","Orianna","Rell","Amumu","Leona","Morgana","Nautilus","Zyra","Miss Fortune","Hwei","Lillia","Rakan","Renata Glasc","Bard","Lux","Neeko","Rumble"],
    tags: ["Mage","Support"],
    reason: "Can fit compositions that create openings with crowd control or area effects and then follow up together."
  },
  Chemtech: {
    champions: ["Aatrox","Briar","Olaf","Tryndamere","Karthus","Sion","Kog'Maw","Swain","Zilean","Renata Glasc","Zac","Dr. Mundo","K'Sante","Warwick"],
    tags: ["Fighter","Tank","Support"],
    reason: "Consider it for compositions built around surviving difficult fights, re-engaging or supporting teammates; verify the current Soul effect before relying on a specific interaction."
  }
};

function soulSideRead(p, side) {
  const selected = p.list.map(x => x.champion);
  if (!selected.length) {
    return `<p><strong>${esc(side)}:</strong> Select champions to generate Soul recommendations.</p>`;
  }

  const soulRows = Object.entries(SOUL_GUIDANCE).map(([soul, guide], originalIndex) => {
    const named = selected.filter(champ =>
      guide.champions.some(name =>
        name.toLowerCase() === champ.name.toLowerCase()
      )
    );
    const tagged = selected.filter(champ =>
      champ.tags.some(tag => guide.tags.includes(tag))
    );

    // Preserve the existing curated heuristic score; this is not a win-rate model.
    const score = named.length * 2 + tagged.length * 0.5;
    const evidenceConfidence = p.list.length < 3
      ? "Low confidence · early draft"
      : p.list.length === 5 && named.length >= 2
        ? "High confidence in heuristic signal"
        : (named.length >= 1 || tagged.length >= 3)
          ? "Moderate confidence"
          : "Low confidence · limited signals";

    const matchedNames = named.map(c => esc(c.name));
    const taggedNames = tagged.map(c =>
      `${esc(c.name)} (${c.tags.filter(t => guide.tags.includes(t)).map(esc).join(", ")})`
    );

    let evidence;
    if (named.length) {
      evidence = `Curated champion matches: ${matchedNames.join(", ")}.`;
    } else if (tagged.length) {
      evidence = "No named champion match in the curated list; broad tag support comes from " + taggedNames.join(", ") + ".";
    } else {
      evidence = "No named champion or broad-tag matches were found by this heuristic. That is missing positive evidence, not proof the Soul is a poor choice.";
    }

    const championReason = named.length
      ? `Selected-champion evidence: ${matchedNames.join(", ")} appear in this Soul's curated playstyle hints.`
      : tagged.length
        ? `Selected-champion evidence is broader rather than specific: ${taggedNames.join(", ")} match the guide's tags.`
        : "Selected-champion evidence: no specific playstyle or broad-tag match was identified.";

    return {
      soul, guide, score, evidenceConfidence, evidence, championReason,
      named, tagged, originalIndex
    };
  });

  soulRows.sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);

  let previousScore = null;
  let previousRank = 0;
  soulRows.forEach((row, index) => {
    row.rank = index > 0 && row.score === previousScore ? previousRank : index + 1;
    previousScore = row.score;
    previousRank = row.rank;
  });

  const bestScore = soulRows[0].score;
  const leastScore = soulRows[soulRows.length - 1].score;
  const bestRows = soulRows.filter(row => row.score === bestScore);
  const leastRows = soulRows.filter(row => row.score === leastScore);
  const bestSouls = bestRows.map(row => `${row.soul} Soul`);
  const leastSouls = leastRows.map(row => `${row.soul} Soul`);
  const allTied = bestScore === leastScore;
  const formatSouls = names => names.map(esc).join(", ");
  const compactChampions = rows => {
    const names = [...new Set(rows.flatMap(row => row.named.map(c => c.name)))];
    return names.length ? names.join(", ") : "No specific curated champion matches";
  };

  const bestExplanation = allTied
    ? "All six Souls have the same score in this draft. The heuristic cannot identify a clear leader or weakest fit."
    : `${bestRows[0].guide.reason} Champion signals: ${compactChampions(bestRows)}.`;
  const leastExplanation = allTied
    ? "Because all scores are tied, there is no defensible least-supported Soul in this heuristic."
    : `This Soul has the lowest positive-signal score for the current draft. ${compactChampions(leastRows)}. A lower score means less support in the curated hints and tags—not a confirmed in-game clash or proof the Soul is bad.`;

  const rankingSummary = allTied
    ? `<p class="soul-ranking-neutral"><strong>No clear most/least useful Soul:</strong> all six have equal heuristic scores for the current ${esc(side)} draft. ${esc(bestExplanation)}</p>`
    : `
      <div class="soul-ranking-summary">
        <div class="soul-ranking-callout soul-ranking-best">
          <span class="soul-ranking-label">Most useful · heuristic</span>
          <strong>${formatSouls(bestSouls)}</strong>
          <span class="soul-ranking-score">Score ${bestScore}</span>
          <p class="soul-callout-reason">${esc(bestExplanation)}</p>
        </div>
        <div class="soul-ranking-callout soul-ranking-least">
          <span class="soul-ranking-label">Least supported · heuristic</span>
          <strong>${formatSouls(leastSouls)}</strong>
          <span class="soul-ranking-score">Score ${leastScore}</span>
          <p class="soul-callout-reason">${esc(leastExplanation)}</p>
        </div>
      </div>
    `;

  const entries = soulRows.map(row => {
    const confidenceClass = row.evidenceConfidence.startsWith("High")
      ? "soul-confidence-high"
      : row.evidenceConfidence.startsWith("Moderate")
        ? "soul-confidence-moderate"
        : "soul-confidence-low";
    return `
      <div class="soul-entry">
        <div class="soul-entry-heading">
          <span class="soul-rank">#${row.rank}</span>
          <h4>${esc(row.soul)} Soul</h4>
          <span class="soul-score">${row.score} pts</span>
        </div>
        <div class="soul-confidence ${confidenceClass}">${esc(row.evidenceConfidence)}</div>
        <p class="soul-entry-reason"><strong>Composition fit:</strong> ${esc(row.guide.reason)}</p>
        <p class="soul-entry-evidence"><strong>Champion-specific evidence:</strong> ${row.evidence}</p>
      </div>
    `;
  }).join("");

  const completeness = p.list.length < 5
    ? `<p class="soul-ranking-note">Preliminary ranking: ${p.list.length}/5 champions selected. Rankings and confidence can change as the draft fills.</p>`
    : "";

  return `<div class="soul-side-read">
    <p><strong>${esc(side)}:</strong> ${p.list.length}/5 champions selected.</p>
    ${rankingSummary}
    ${completeness}
    <h4 class="soul-list-heading">All Souls ranked · highest to lowest signal</h4>
    ${entries}
    <p class="soul-ranking-note">Confidence describes support within this heuristic, not statistical certainty about game outcomes. Scores use curated champion-playstyle hints and broad Data Dragon tags; they are not measured Soul win rates. The model does not identify hard counters between a Soul and a draft, so “least supported” means fewer positive signals, not a verified clash.</p>
  </div>`;
}
function objectiveAnalysis(b, r) {
  return card("Strategic Objective Value", `
      <div class="eyebrow">MAP CONTROL / OBJECTIVES</div>
      <div class="report-grid objective-grid">
        ${objectiveCard(
          "Dragon Control",
          "Compare the selected jungle, mid, support and damage profile before deciding whether to contest.",
          objectiveSideRead(b, r, "Blue", "Dragon"),
          objectiveSideRead(r, b, "Red", "Dragon"),
          "The side with better nearby wave states, numbers and vision should usually control the setup. If those conditions are missing, consider a cross-map trade instead."
        )}
        ${objectiveCard(
          "Dragon Soul",
          "Soul is a major long-term win condition. The best setup depends on the actual champions, the Soul type and whether either team is on Soul point.",
          objectiveSideRead(b, r, "Blue", "Dragon Soul"),
          objectiveSideRead(r, b, "Red", "Dragon Soul"),
          "Arrive together, decide who engages and who protects carries, and compare the cost of contesting with the cost of conceding. The app does not track Dragon stacks or the active Soul."
        )}
        ${objectiveCard(
          "Elemental Soul Considerations",
          "Compare all six Souls against the selected champions. Ratings are heuristic signals from curated champion playstyles and broad Data Dragon tags, not measured Soul win rates.",
          soulSideRead(b, "Blue"),
          soulSideRead(r, "Red"),
          "Soul value also depends on the current patch, the enemy composition, game state and how each team executes. Verify the live Soul effect before relying on a specific interaction."
        )}
        ${objectiveCard(
          "Rift Herald",
          "Herald is a map-pressure tool; the lane and timing of its use matter as much as taking it.",
          objectiveSideRead(b, r, "Blue", "Rift Herald"),
          objectiveSideRead(r, b, "Red", "Rift Herald"),
          "Prepare a wave and choose a tower your team can safely pressure. Track enemy rotations so the objective is converted into structure value."
        )}
        ${objectiveCard(
          "Baron Nashor",
          "Baron can enable a siege, but starting it can expose a team to an engage or steal.",
          objectiveSideRead(b, r, "Blue", "Baron"),
          objectiveSideRead(r, b, "Red", "Baron"),
          "Prefer a won fight, pick or controlled vision setup. Compare actual damage speed and enemy steal/engage threats before committing."
        )}
      </div>
      <p class="disclaimer">
        Objective advice now uses each side's selected champion names, role slots and Data Dragon tags to produce different context and comparisons.
        It does not inspect champion abilities, live game state, gold, vision, timers, actual lane priority or verified objective win rates.
        Treat it as a draft-planning aid, not a guaranteed prediction.
      </p>
  `);
}

// --- Draft phase and matchup analysis ---
function phaseScore(p, phase) {
    let score = 5;
    const hasRole = key => p.list.some(x => x.key === key);

    if (phase === "early") {
        if (hasRole("jungle")) score += 0.5;
        if (p.assassins > 0) score += 0.7;
        if (p.fighters > 0) score += 0.6;
        if (p.mages > 0) score += 0.3;
        if (p.tanks > 1) score -= 0.2;
    } else if (phase === "mid") {
        if (p.fighters > 0) score += 0.5;
        if (p.mages > 0) score += 0.5;
        if (p.tanks > 0) score += 0.4;
        if (p.assassins > 0) score += 0.4;
        if (hasRole("support")) score += 0.2;
    } else if (phase === "late") {
        if (p.marksmen > 0) score += 0.8;
        if (p.marksmen > 1) score += 0.4;
        if (p.mages > 0) score += 0.4;
        if (p.tanks > 0) score += 0.3;
        if (hasRole("support")) score += 0.2;
        if (p.assassins > 1) score -= 0.3;
    }

    if (p.list.length < 5) score -= (5 - p.list.length) * 0.5;
    return Math.max(1, Math.min(10, score));
}

function phaseExplanation(p, phase) {
    const notes = [];
    if (p.list.length < 5) {
        notes.push(`Only ${p.list.length}/5 picks selected; this estimate is incomplete.`);
    }

    if (phase === "early") {
        if (p.assassins || p.fighters) {
            notes.push("Assassin/Fighter tags may support skirmishes, but actual early strength depends on champion kits and matchups.");
        }
        if (p.list.some(x => x.key === "jungle")) {
            notes.push("Jungle presence is selected; clear speed, gank setup and lane priority still need checking.");
        }
        if (!p.assassins && !p.fighters) {
            notes.push("The available tags show limited Assassin/Fighter presence; inspect early trading, ranged pressure and jungle setup.");
        }
    } else if (phase === "mid") {
        if (p.tanks || p.fighters) {
            notes.push("Tank/Fighter tags may help with skirmishes and objective setup.");
        }
        if (p.mages || p.assassins) {
            notes.push("Mage/Assassin tags may provide burst, picks or control, depending on individual abilities.");
        }
        if (!p.tanks && !p.fighters) {
            notes.push("Check who can safely establish vision and start or disengage from fights.");
        }
    } else {
        if (p.marksmen) {
            notes.push("Marksman tags suggest potential sustained damage if carries survive and can attack safely.");
        }
        if (p.mages) {
            notes.push("Mage tags may provide scaling, range or area control; individual champion kits matter.");
        }
        if (!p.marksmen && !p.mages) {
            notes.push("The tags do not identify a Mage or Marksman; inspect actual damage output and scaling before judging late-game strength.");
        }
    }

    return notes.map(n => `<li>${esc(n)}</li>`).join("");
}

function phaseAnalysis(b, r) {
    const phases = [
        { key: "early", title: "Early game" },
        { key: "mid", title: "Mid game" },
        { key: "late", title: "Late game" }
    ];

    const rows = phases.map(phase => {
        const bs = phaseScore(b, phase.key);
        const rs = phaseScore(r, phase.key);
        const diff = bs - rs;
        let verdict = "No clear tag-based edge";
        if (diff >= 0.6) verdict = "Blue has the higher heuristic score";
        if (diff <= -0.6) verdict = "Red has the higher heuristic score";

        return `
          <section class="phase-card">
            <h4>${phase.title}</h4>
            <p><strong>Blue:</strong> ${bs.toFixed(1)}/10</p>
            <p><strong>Red:</strong> ${rs.toFixed(1)}/10</p>
            <p><strong>Comparison:</strong> ${verdict}</p>
            <div class="phase-side">
              <strong>Blue considerations</strong>
              <ul>${phaseExplanation(b, phase.key)}</ul>
            </div>
            <div class="phase-side">
              <strong>Red considerations</strong>
              <ul>${phaseExplanation(r, phase.key)}</ul>
            </div>
          </section>`;
    }).join("");

    const blueAvg = phases.reduce((sum, phase) =>
        sum + phaseScore(b, phase.key), 0) / phases.length;
    const redAvg = phases.reduce((sum, phase) =>
        sum + phaseScore(r, phase.key), 0) / phases.length;

    let overall = "The tag-based estimates are broadly even.";
    if (blueAvg - redAvg >= 0.6) overall = "Blue has the higher overall heuristic score.";
    if (redAvg - blueAvg >= 0.6) overall = "Red has the higher overall heuristic score.";

    return `
      <p><strong>Overall comparison:</strong> ${overall}</p>
      <p>Blue average: ${blueAvg.toFixed(1)}/10 Â· Red average: ${redAvg.toFixed(1)}/10</p>
      <div class="phase-grid">${rows}</div>
      <p><em>These scores are simple tag-based indicators, not win probabilities or verified power rankings. They do not model individual champion scaling, items, player skill or patch-specific balance.</em></p>`;
}

function matchupHint(a, b) {
    const at = a.champion.tags;
    const bt = b.champion.tags;
    const hints = [];

    if (at.includes("Assassin") &&
        (bt.includes("Marksman") || bt.includes("Mage"))) {
        hints.push(`${a.champion.name} may threaten ${b.champion.name} if it can reach the backline. Range, mobility, crowd control and peel can change this interaction.`);
    }

    if (bt.includes("Assassin") &&
        (at.includes("Marksman") || at.includes("Mage"))) {
        hints.push(`${b.champion.name} may threaten ${a.champion.name} if it can reach the backline. Range, mobility, crowd control and peel can change this interaction.`);
    }

    if (at.includes("Marksman") && bt.includes("Tank")) {
        hints.push(`${a.champion.name} may provide sustained damage against a durable target, provided it can attack safely.`);
    }

    if (bt.includes("Marksman") && at.includes("Tank")) {
        hints.push(`${b.champion.name} may provide sustained damage against a durable target, provided it can attack safely.`);
    }

    if (at.includes("Mage") && bt.includes("Fighter")) {
        hints.push(`${a.champion.name} may use range or control to manage ${b.champion.name}'s approach, depending on their actual abilities.`);
    }

    if (bt.includes("Mage") && at.includes("Fighter")) {
        hints.push(`${b.champion.name} may use range or control to manage ${a.champion.name}'s approach, depending on their actual abilities.`);
    }

    if (at.includes("Tank") && bt.includes("Assassin")) {
        hints.push(`${a.champion.name} may contribute durability or protection against dives, depending on its kit.`);
    }

    if (bt.includes("Tank") && at.includes("Assassin")) {
        hints.push(`${b.champion.name} may contribute durability or protection against dives, depending on its kit.`);
    }

    if (!hints.length) {
        hints.push("The broad champion tags do not establish a reliable counter relationship. Compare abilities, range, cooldowns, wave clear and trading patterns.");
    }

    return hints;
}

function counterAnalysis() {
    return ROLES.map(role => {
        const blue = champions.find(
            c => c.id === teams.blue[role.key]
        );
        const red = champions.find(
            c => c.id === teams.red[role.key]
        );

        if (!blue || !red) {
            return `<li><strong>${esc(role.label)}:</strong>
                Select both champions to assess this matchup.</li>`;
        }

        const hints = matchupHint(
            { key: role.key, champion: blue },
            { key: role.key, champion: red }
        );

        const uniqueHints = [...new Set(hints)];

        return `
          <li>
            <strong>${esc(role.label)} - ${esc(blue.name)}
            vs ${esc(red.name)}</strong>
            <ul>
              ${uniqueHints.map(h => `<li>${esc(h)}</li>`).join("")}
            </ul>
          </li>`;
    }).join("");
}
// --- End draft phase and matchup analysis ---
