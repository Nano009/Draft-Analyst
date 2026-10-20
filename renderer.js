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
}function card(title,content){return `<article class="report-card"><h3>${title}</h3>${content}</article>`}

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
  return `
    <section class="objective-analysis">
      <div class="section-heading">
        <div>
          <div class="eyebrow">MAP CONTROL / OBJECTIVES</div>
          <h2>Strategic Objective Value</h2>
        </div>
      </div>
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
    </section>
  `;
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
function teamCompositionAnalysis(b, r) {
  function clampScore(value) {
    return Math.round(Math.max(0, Math.min(100, value)));
  }

  function scorecard(p) {
    const score = {
      frontline: clampScore(p.tanks * 32 + p.fighters * 12),
      engage: clampScore(p.tanks * 18 + p.fighters * 12 + p.supports * 15),
      crowdControl: clampScore(p.tanks * 15 + p.fighters * 12 + p.mages * 10 + p.supports * 15),
      damageDiversity: clampScore(
        (p.mages > 0 && p.marksmen > 0 ? 65 : (p.mages > 0 || p.marksmen > 0 ? 40 : 20))
        + Math.min(15, p.fighters * 5)
      ),
      scaling: clampScore(p.marksmen * 18 + p.mages * 10 + p.tanks * 8 + p.fighters * 5),
      pickPotential: clampScore(p.assassins * 30 + p.fighters * 8 + p.mages * 8)
    };

    const dimensions = [
      {
        label: "Frontline potential",
        value: score.frontline,
        explanation: "Estimated from Tank and Fighter tags. Durability and actual frontline ability depend on individual kits."
      },
      {
        label: "Engage potential",
        value: score.engage,
        explanation: "Uses Tank, Fighter and Support tags as rough proxies. It does not check whether champions have reliable engage tools."
      },
      {
        label: "Crowd-control potential",
        value: score.crowdControl,
        explanation: "Uses broad champion tags only. Actual crowd-control types, duration, range and reliability are not analysed."
      },
      {
        label: "Damage-tag diversity",
        value: score.damageDiversity,
        explanation: "Rewards having both Mage and Marksman tags. These tags do not prove the team's actual magic/physical damage split."
      },
      {
        label: "Scaling indicators",
        value: score.scaling,
        explanation: "A very rough tag-based indicator, not a champion-specific scaling ranking. It does not model levels, items or abilities."
      },
      {
        label: "Pick potential",
        value: score.pickPotential,
        explanation: "Uses Assassin, Fighter and Mage tags as proxies. Vision, mobility, target access and actual abilities are not verified."
      }
    ];

    return dimensions.map(item => `
      <div class="composition-score-row">
        <div class="composition-score-heading">
          <strong>${item.label}</strong>
          <span>${item.value}/100</span>
        </div>
        <div class="composition-score-track"
             role="img"
             aria-label="${item.label}: ${item.value} out of 100">
          <div class="composition-score-fill" style="width:${item.value}%"></div>
        </div>
        <p>${item.explanation}</p>
      </div>
    `).join("");
  }

  function notes(p) {
    const out = [];
    const roles = new Set(p.list.map(x => x.key));

    if (p.list.length < 5) {
      out.push(`Draft incomplete: ${p.list.length}/5 champions selected. Scores are provisional and may change as picks are added.`);
    }

    if (p.tanks >= 2) {
      out.push("Several Tank-tagged champions suggest potential durability. Check which champions can engage and which should peel.");
    } else if (p.tanks === 1) {
      out.push("One Tank-tagged champion may provide frontline, but the team could depend heavily on that champion's positioning.");
    } else {
      out.push("No Tank-tagged champions selected. Check whether Fighters or individual abilities provide enough durability.");
    }

    if (p.mages > 0 && p.marksmen > 0) {
      out.push("Mage and Marksman tags are both present. Verify actual damage types from champion abilities before judging damage balance.");
    } else if (p.mages >= 2) {
      out.push("Multiple Mage tags: check actual damage types and whether opponents can itemise defensively against the team.");
    } else if (p.marksmen >= 2) {
      out.push("Multiple Marksman tags: check whether the team can protect its sustained damage sources.");
    }

    if (p.assassins >= 2) {
      out.push("Multiple Assassin tags suggest possible backline access. Consider how the team handles prolonged front-to-back fights.");
    } else if (p.assassins === 1) {
      out.push("An Assassin-tagged pick may create opportunities against vulnerable enemies, depending on its kit and available vision.");
    }

    if (p.fighters >= 2) {
      out.push("Several Fighter tags may support skirmishing and side-lane pressure. Check engage options and escape plans.");
    }

    if (!roles.has("jungle") || !roles.has("mid") || !roles.has("support")) {
      out.push("One or more jungle, mid or support slots are missing. Objective setup and coordinated map control are harder to assess.");
    } else {
      out.push("Jungle, mid and support slots are filled. Coordinate their movement for vision and objective setup; this does not guarantee lane priority.");
    }

    out.push("Review actual champion abilities for engage, crowd control, disengage and peel; these cannot be confirmed from broad tags alone.");

    return out;
  }

  const blueNotes = notes(b);
  const redNotes = notes(r);
  const differences = [];

  if (b.tanks > r.tanks) {
    differences.push("Blue has more Tank-tagged champions, suggesting potentially more frontline.");
  } else if (r.tanks > b.tanks) {
    differences.push("Red has more Tank-tagged champions, suggesting potentially more frontline.");
  }

  if (b.fighters > r.fighters) {
    differences.push("Blue has more Fighter tags, which may support skirmishing or side-lane pressure.");
  } else if (r.fighters > b.fighters) {
    differences.push("Red has more Fighter tags, which may support skirmishing or side-lane pressure.");
  }

  if (b.assassins > r.assassins) {
    differences.push("Blue has more Assassin tags; compare backline access and protection.");
  } else if (r.assassins > b.assassins) {
    differences.push("Red has more Assassin tags; compare backline access and protection.");
  }

  if (b.list.length !== r.list.length) {
    differences.push(`Blue has ${b.list.length}/5 picks and Red has ${r.list.length}/5. Reassess when both drafts are complete.`);
  }

  if (!differences.length) {
    differences.push("Broad Tank, Fighter and Assassin counts show no clear difference. Compare actual abilities, range, crowd control and execution.");
  }

  return card("Team Composition Review", `
    <p class="composition-score-disclaimer">
      <strong>Heuristic scorecard:</strong> scores are rough tag-based indicators, not win probabilities,
      verified champion ratings or live matchup statistics. A high score does not guarantee strength.
    </p>

    <div class="composition-scorecards">
      <section class="composition-scorecard">
        <h4>&#128309; Blue side scorecard</h4>
        ${scorecard(b)}
      </section>
      <section class="composition-scorecard">
        <h4>&#128308; Red side scorecard</h4>
        ${scorecard(r)}
      </section>
    </div>

    <h4>Blue side: strengths and checks</h4>
    <ul>${blueNotes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>

    <h4>Red side: strengths and checks</h4>
    <ul>${redNotes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>

    <h4>Key differences</h4>
    <ul>${differences.map(x => `<li>${esc(x)}</li>`).join("")}</ul>

    <p><em>These estimates do not verify individual champion abilities, player skill, items, patch-specific balance or live game state.</em></p>
  `);
}

function draftIdentityAnalysis(b, r) {
  const definitions = [
    {
      title: "Front-to-back",
      points: p =>
        (p.marksmen > 0 ? 2 : 0) +
        (p.tanks > 0 ? 2 : 0) +
        (p.supports > 0 ? 1 : 0),
      explanation: "Marksman, Tank and Support tags may fit a composition built around protecting sustained damage.",
      check: "Verify actual frontline, reliable engage, peel and carry protection."
    },
    {
      title: "Zone control",
      points: p =>
        (p.mages > 0 ? 2 : 0) +
        (p.supports > 0 ? 1 : 0) +
        (p.tanks > 0 ? 1 : 0),
      explanation: "Mage, Support and Tank tags may indicate tools for controlling space around objectives.",
      check: "Inspect actual area denial, range, crowd control and ability cooldowns."
    },
    {
      title: "Poke",
      points: p =>
        (p.mages > 0 ? 2 : 0) +
        (p.marksmen > 0 ? 1 : 0) +
        (p.tanks === 0 ? 1 : 0),
      explanation: "The selected tags may fit a composition that wants to weaken opponents before committing.",
      check: "Confirm long-range damage, safe wave clear and ways to disengage from hard engage."
    },
    {
      title: "Pick and catch",
      points: p =>
        (p.assassins > 0 ? 2 : 0) +
        (p.mages > 0 ? 1 : 0) +
        (p.fighters > 0 ? 1 : 0) +
        (p.list.some(x => x.key === "jungle") ? 1 : 0),
      explanation: "Assassin, Mage and Fighter tags may offer burst or skirmishing potential.",
      check: "Verify reliable catch tools, target access, vision control and follow-up damage."
    },
    {
      title: "Split push",
      points: p =>
        (p.fighters > 0 ? 2 : 0) +
        (p.list.some(x => x.key === "top") ? 1 : 0) +
        (p.assassins > 0 ? 1 : 0),
      explanation: "Fighter and Assassin tags may support side-lane pressure, depending on the champions.",
      check: "Check duelling matchups, escape tools, wave clear and whether the remaining four can hold safely."
    },
    {
      title: "Skirmish and dive",
      points: p =>
        (p.fighters > 0 ? 1 : 0) +
        (p.assassins > 0 ? 1 : 0) +
        (p.list.some(x => x.key === "jungle") ? 1 : 0) +
        (p.tanks > 0 ? 1 : 0),
      explanation: "Fighter, Assassin, Jungle and Tank tags may fit a composition looking for skirmishes or forward engagements.",
      check: "Confirm mobility, entry timing, crowd control and whether teammates can follow up."
    },
    {
      title: "Protect the carry",
      points: p =>
        (p.marksmen > 0 ? 2 : 0) +
        (p.supports > 0 ? 2 : 0) +
        (p.tanks > 0 ? 1 : 0),
      explanation: "Marksman, Support and Tank tags may fit a plan centred on keeping a damage dealer safe.",
      check: "Verify actual shields, healing, peel, disengage and whether the team relies too heavily on one carry."
    }
  ];

  function describe(p, side) {
    if (!p.list.length) {
      return `<section class="phase-card">
        <h4>${side}</h4>
        <p>Select champions to assess possible draft identities.</p>
      </section>`;
    }

    const candidates = definitions
      .map(item => ({ ...item, points: item.points(p) }))
      .filter(item => item.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 2);

    if (!candidates.length) {
      return `<section class="phase-card">
        <h4>${side}</h4>
        <p>There is not enough tag evidence to suggest an identity yet.</p>
      </section>`;
    }

    const candidateHtml = candidates.map(item => `
      <li>
        <strong>${esc(item.title)}</strong>
        <p>${esc(item.explanation)}</p>
        <p><em>Check: ${esc(item.check)}</em></p>
      </li>
    `).join("");

    return `
      <section class="phase-card">
        <h4>${side}</h4>
        <p>Possible identities suggested by the current champion tags and selected roles:</p>
        <ul>${candidateHtml}</ul>
      </section>
    `;
  }

  return card("Draft Identity Review", `
    <p class="composition-score-disclaimer">
      These are preliminary hypotheses, not verified composition classifications.
      The current data does not establish individual abilities, champion synergies,
      matchup statistics or a likely winner. Multiple identities can coexist.
    </p>
    <div class="phase-grid">
      ${describe(b, "Blue side")}
      ${describe(r, "Red side")}
    </div>
    <p><strong>Drafting principle:</strong> choose a coherent way to win fights
    and objectives, then verify that the actual champion kits support that plan.</p>
  `);
}

function normalizeProChampionName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function professionalPercent(value) {
  if (value == null || !Number.isFinite(Number(value))) return "N/A";
  return Number(value).toFixed(1) + "%";
}

function findProfessionalChampion(champion, championMap) {
  const candidates = [champion.name, champion.id];

  // Data Dragon and match-data sources can use different names for Wukong.
  if (candidates.some(value =>
    ["wukong", "monkeyking"].includes(normalizeProChampionName(value))
  )) {
    candidates.push("Wukong", "MonkeyKing");
  }

  for (const candidate of candidates) {
    const result = championMap.get(normalizeProChampionName(candidate));
    if (result) return result;
  }
  return null;
}

function professionalStatsCard(blueProfile, redProfile) {
  if (!professionalStats) {
    return card("Professional esports stats",
      `<p>${esc(professionalStatsError ||
        "Professional statistics are loading…")}</p>`);
  }

  const patches = Object.keys(professionalStats.patches || {}).sort((a, b) => {
    const aa = a.split(".").map(Number);
    const bb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
      const difference = (aa[i] || 0) - (bb[i] || 0);
      if (difference) return difference;
    }
    return 0;
  });

  if (!patches.length) {
    return card("Professional esports stats",
      "<p>No patch statistics are available in the data file.</p>");
  }

  const patch = patches[patches.length - 1];
  const stats = professionalStats.patches[patch];
  const championMap = new Map(
    Object.entries(stats.champions || {}).map(([name, value]) => [
      normalizeProChampionName(name),
      { name, ...value }
    ])
  );

  function teamRows(profile) {
    if (!profile.list.length) {
      return "<li>No champions selected yet.</li>";
    }

    return profile.list.map(entry => {
      const found = findProfessionalChampion(entry.champion, championMap);
      if (!found) {
        return `<li><strong>${esc(entry.champion.name)}</strong> (${esc(entry.label)}):
          no matching record found for this patch.</li>`;
      }

      const roleStats = found.roles && found.roles[entry.key];
      const useRoleStats = Boolean(roleStats && roleStats.picks > 0);
      const selectedStats = useRoleStats ? roleStats : found;
      const sample = Number(selectedStats.picks || 0);
      const sampleLabel = sample < 20
        ? ' <span class="metric">Low sample</span>'
        : '';
      const scope = useRoleStats ? "role" : "overall";
      const bans = Number(found.bans || 0);

      return `<li>
        <strong>${esc(entry.champion.name)}</strong> (${esc(entry.label)})
        <div class="metric-row">
          <span class="metric">${scope} WR: ${professionalPercent(selectedStats.winRate)}</span>
          <span class="metric">Pick rate: ${professionalPercent(selectedStats.pickRate)}</span>
          <span class="metric">Ban rate: ${professionalPercent(found.banRate)}</span>
          <span class="metric">Picks: ${sample}</span>
          <span class="metric">Bans: ${bans}</span>
          ${sampleLabel}
        </div>
      </li>`;
    }).join("");
  }

  const source = typeof professionalStats.source === "string"
    ? professionalStats.source
    : "Oracle's Elixir match data";

  return card("Professional esports stats", `
    <p><strong>Patch ${esc(patch)}</strong> ·
      ${Number(stats.matches || 0).toLocaleString()} completed matches ·
      Source: ${esc(source)}</p>
    <div class="report-grid">
      <section>
        <h4>Blue side</h4>
        <ul>${teamRows(blueProfile)}</ul>
      </section>
      <section>
        <h4>Red side</h4>
        <ul>${teamRows(redProfile)}</ul>
      </section>
    </div>
    <p><small>Role-specific win and pick rates are used when available;
    otherwise overall champion rates are shown. Win-rate sample size is
    the number of picks in the displayed role (or overall). Pick and ban
    rates are per match. Low sample means fewer than 20 picks. These are
    historical professional results, not predictions for this draft.</small></p>
  `);
}

function professionalMatchupSynergyCard(blueProfile, redProfile) {
  if (!professionalStats || !professionalStats.patches) return "";

  const patches = Object.keys(professionalStats.patches).sort((a, b) => {
    const aa = a.split(".").map(Number);
    const bb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
      const difference = (aa[i] || 0) - (bb[i] || 0);
      if (difference) return difference;
    }
    return 0;
  });
  if (!patches.length) return "";

  const patch = patches[patches.length - 1];
  const current = professionalStats.patches[patch];
  const history = professionalStats.allPatches || {};
  const currentMatchups = current.matchups || {};
  const historyMatchups = history.matchups || {};
  const currentSynergies = current.synergies || {};
  const historySynergies = history.synergies || {};

  function lookupName(object, name) {
    const target = normalizeProChampionName(name);
    const key = Object.keys(object || {}).find(
      value => normalizeProChampionName(value) === target
    );
    return key ? object[key] : null;
  }

  function getMatchup(source, role, champion, opponent) {
    const byRole = source[role] || {};
    const byChampion = lookupName(byRole, champion);
    return byChampion ? lookupName(byChampion, opponent) : null;
  }

  function describe(name, recent, historical) {
    const lines = [];
    if (recent) {
      const warning = recent.games < 10 ? " | Low sample" : "";
      lines.push(`Patch ${esc(patch)}: ${professionalPercent(recent.winRate)}, ${recent.games} games${warning}`);
    } else {
      lines.push(`Patch ${esc(patch)}: no recorded games`);
    }

    if (historical) {
      const warning = historical.games < 30 ? " | Limited history" : "";
      lines.push(`All patches: ${professionalPercent(historical.winRate)}, ${historical.games} games${warning}`);
    } else {
      lines.push("All patches: no recorded history");
    }

    return `<span>${esc(name)} | ${lines.join(" | ")}</span>`;
  }

  function matchupRow(blue, red, role) {
    if (!blue || !red) {
      return `<li>${esc(role.label)}: select both lane champions to compare professional results.</li>`;
    }

    const blueRecent = getMatchup(currentMatchups, role.key, blue.champion.name, red.champion.name);
    const blueHistory = getMatchup(historyMatchups, role.key, blue.champion.name, red.champion.name);
    const redRecent = getMatchup(currentMatchups, role.key, red.champion.name, blue.champion.name);
    const redHistory = getMatchup(historyMatchups, role.key, red.champion.name, blue.champion.name);

    if (!blueRecent && !blueHistory && !redRecent && !redHistory) {
      return `<li><strong>${esc(role.label)} | ${esc(blue.champion.name)} vs ${esc(red.champion.name)}:</strong> no matchup records found.</li>`;
    }

    return `<li>
      <strong>${esc(role.label)} | ${esc(blue.champion.name)} vs ${esc(red.champion.name)}</strong><br>
      ${describe(blue.champion.name, blueRecent, blueHistory)}<br>
      ${describe(red.champion.name, redRecent, redHistory)}
    </li>`;
  }

  function synergyRows(profile) {
    const list = profile.list;
    if (list.length < 2) return "<li>Select at least two champions on this side.</li>";

    const pairs = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i].champion.name;
        const b = list[j].champion.name;
        const recentMap = lookupName(currentSynergies, a);
        const historyMap = lookupName(historySynergies, a);
        const recent = recentMap ? lookupName(recentMap, b) : null;
        const historical = historyMap ? lookupName(historyMap, b) : null;
        if (recent || historical) {
          pairs.push({ a, b, recent, historical });
        }
      }
    }

    if (!pairs.length) {
      return "<li>No recorded allied-pair results found for these picks.</li>";
    }

    pairs.sort((a, b) =>
      ((b.historical && b.historical.games) || 0) -
      ((a.historical && a.historical.games) || 0)
    );

    return pairs.map(pair => {
      const recentText = pair.recent
        ? `Patch ${esc(patch)}: ${professionalPercent(pair.recent.winRate)} across ${pair.recent.games} games${pair.recent.games < 10 ? " | Low sample" : ""}`
        : `Patch ${esc(patch)}: no recorded games`;
      const historyText = pair.historical
        ? `All patches: ${professionalPercent(pair.historical.winRate)} across ${pair.historical.games} games${pair.historical.games < 30 ? " | Limited history" : ""}`
        : "All patches: no recorded history";

      return `<li><strong>${esc(pair.a)} + ${esc(pair.b)}</strong><br>${recentText}<br>${historyText}</li>`;
    }).join("");
  }

  return card("Professional lane matchups & team synergy", `
    <p><strong>Latest patch: ${esc(patch)}</strong> (${Number(current.matches || 0).toLocaleString()} completed matches). Historical results pool ${Number(history.matches || 0).toLocaleString()} completed matches across available patches.</p>
    <h4>Lane matchups</h4>
    <ul>${ROLES.map(role => {
      const blue = blueProfile.list.find(item => item.key === role.key);
      const red = redProfile.list.find(item => item.key === role.key);
      return matchupRow(blue, red, role);
    }).join("")}</ul>
    <div class="report-grid">
      <section>
        <h4>Blue allied pairs</h4>
        <ul>${synergyRows(blueProfile)}</ul>
      </section>
      <section>
        <h4>Red allied pairs</h4>
        <ul>${synergyRows(redProfile)}</ul>
      </section>
    </div>
    <p><small>Patch-specific results are shown separately from pooled historical results. Low sample means fewer than 10 games on the latest patch; limited history means fewer than 30 games across patches. Historical rates can reflect different patches, balance states, teams and player skill. Win rate is descriptive, not proof of a counter or synergy advantage.</small></p>
  `);
}


function draftEvidenceInsights(blueProfile, redProfile) {
  if (!professionalStats || !professionalStats.patches) return "";

  const patches = Object.keys(professionalStats.patches).sort((a, b) => {
    const aa = a.split(".").map(Number);
    const bb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
      const difference = (aa[i] || 0) - (bb[i] || 0);
      if (difference) return difference;
    }
    return 0;
  });

  if (!patches.length) return "";

  const patch = patches[patches.length - 1];
  const recent = professionalStats.patches[patch];
  const history = professionalStats.allPatches || {};
  const recentMatchups = recent.matchups || {};
  const historyMatchups = history.matchups || {};
  const recentSynergies = recent.synergies || {};
  const historySynergies = history.synergies || {};

  function findName(object, name) {
    const target = normalizeProChampionName(name);
    const key = Object.keys(object || {}).find(
      value => normalizeProChampionName(value) === target
    );
    return key ? object[key] : null;
  }

  function matchup(source, role, champion, opponent) {
    const roleData = source[role] || {};
    const championData = findName(roleData, champion);
    return championData ? findName(championData, opponent) : null;
  }

  function reliability(games, threshold) {
    if (games < threshold) return "limited sample";
    return "sample threshold met";
  }

  // Wilson score interval for a historical win rate.
  // winRate is expressed as a percentage from 0 to 100.
  function wilsonInterval(winRate, games) {
    const z = 1.96;
    const n = Number(games);
    const p = Number(winRate) / 100;

    if (!Number.isFinite(n) || n <= 0 ||
        !Number.isFinite(p) || p < 0 || p > 1) {
      return null;
    }

    const denominator = 1 + (z * z) / n;
    const centre = (p + (z * z) / (2 * n)) / denominator;
    const margin = (
      z * Math.sqrt((p * (1 - p) / n) +
                    (z * z) / (4 * n * n))
    ) / denominator;

    return {
      lower: (centre - margin) * 100,
      upper: (centre + margin) * 100
    };
  }

  const laneSignals = [];

  for (const role of ROLES) {
    const blue = blueProfile.list.find(x => x.key === role.key);
    const red = redProfile.list.find(x => x.key === role.key);

    if (!blue || !red) continue;

    const blueName = blue.champion.name;
    const redName = red.champion.name;
    const h = matchup(
      historyMatchups, role.key, blueName, redName
    );
    const p = matchup(
      recentMatchups, role.key, blueName, redName
    );

    let interpretation = "No clear historical lean";

    if (h && h.games >= 30) {
      const interval = wilsonInterval(h.winRate, h.games);

      if (interval && interval.lower > 50) {
        interpretation = "Historical results lean Blue";
      } else if (interval && interval.upper < 50) {
        interpretation = "Historical results lean Red";
      } else {
        interpretation = "No clear historical lean (95% interval includes 50%)";
      }
    } else if (!h) {
      interpretation = "No historical matchup record";
    } else {
      interpretation = "Historical sample is limited";
    }

    let recentNote = "No latest-patch matchup record";
    if (p) {
      recentNote =
        `Patch ${patch}: ${professionalPercent(p.winRate)} ` +
        `across ${p.games} games (${reliability(p.games, 10)})`;
    }

    laneSignals.push({
      role: role.label,
      blueName,
      redName,
      historical: h,
      interpretation,
      recentNote
    });
  }

  function renderLanes() {
    if (!laneSignals.length) {
      return "<p>Select both teams' lane champions to generate matchup insights.</p>";
    }

    return `<ul>${laneSignals.map(x => {
      const interval = x.historical
        ? wilsonInterval(x.historical.winRate, x.historical.games)
        : null;

      const historicalText = x.historical
        ? `${professionalPercent(x.historical.winRate)} across ` +
          `${x.historical.games} games` +
          (interval
            ? ` (95% interval ${interval.lower.toFixed(1)}-${interval.upper.toFixed(1)}%)`
            : "")
        : "No recorded historical results";

      return `<li>
        <strong>${esc(x.role)}: ${esc(x.blueName)} vs ${esc(x.redName)}</strong>
        <p>${esc(x.interpretation)}. ${esc(x.blueName)} historical win rate:
        ${esc(historicalText)}.</p>
        <p><small>${esc(x.recentNote)}</small></p>
      </li>`;
    }).join("")}</ul>`;
  }

  function getPairStats(source, a, b) {
    const first = findName(source, a);
    return first ? findName(first, b) : null;
  }

  function collectPairs(profile) {
    const pairs = [];

    for (let i = 0; i < profile.list.length; i++) {
      for (let j = i + 1; j < profile.list.length; j++) {
        const a = profile.list[i].champion.name;
        const b = profile.list[j].champion.name;
        const h = getPairStats(historySynergies, a, b);
        const p = getPairStats(recentSynergies, a, b);

        if (h || p) pairs.push({ a, b, historical: h, recent: p });
      }
    }

    return pairs;
  }

  function renderSynergies(profile, side) {
    const pairs = collectPairs(profile);

    if (!pairs.length) {
      return `<p>${side}: no recorded allied-pair results for the selected champions.</p>`;
    }

    const supported = pairs
      .filter(x => {
        if (!x.historical || x.historical.games < 30) return false;
        const interval = wilsonInterval(
          x.historical.winRate, x.historical.games
        );
        return interval && interval.lower > 50;
      })
      .sort((a, b) =>
        (b.historical.winRate - a.historical.winRate) ||
        (b.historical.games - a.historical.games)
      )
      .slice(0, 3);

    if (!supported.length) {
      const observed = pairs
        .filter(x => x.historical)
        .sort((a, b) =>
          b.historical.games - a.historical.games
        )
        .slice(0, 2);

      if (!observed.length) {
        return `<p>${side}: historical pair data is unavailable for these picks.</p>`;
      }

      return `<p>${side}: no pair meets both the 30-game and 55% historical
        thresholds. Most-observed pairs:</p>
        <ul>${observed.map(x => `
          <li><strong>${esc(x.a)} + ${esc(x.b)}</strong>:
          ${professionalPercent(x.historical.winRate)} over
          ${x.historical.games} games.</li>
        `).join("")}</ul>`;
    }

    return `<ul>${supported.map(x => {
      const recentText = x.recent
        ? `Latest patch: ${professionalPercent(x.recent.winRate)} ` +
          `over ${x.recent.games} games`
        : "No latest-patch pair record";

      const interval = wilsonInterval(
        x.historical.winRate, x.historical.games
      );
      const intervalText = interval
        ? ` 95% interval: ${interval.lower.toFixed(1)}-${interval.upper.toFixed(1)}%.`
        : "";

      return `<li>
        <strong>${esc(x.a)} + ${esc(x.b)}</strong>:
        ${professionalPercent(x.historical.winRate)} over
        ${x.historical.games} historical games.${intervalText}
        <p><small>${esc(recentText)}</small></p>
      </li>`;
    }).join("")}</ul>`;
  }

  const blueCount = laneSignals.filter(
    x => x.interpretation === "Historical results lean Blue"
  ).length;
  const redCount = laneSignals.filter(
    x => x.interpretation === "Historical results lean Red"
  ).length;
  const usableCount = laneSignals.filter(
    x => x.historical && x.historical.games >= 30
  ).length;

  let verdict;
  if (!laneSignals.length) {
    verdict = "Select both teams' lane champions to begin the comparison.";
  } else if (usableCount === 0) {
    verdict = "There is not enough historical lane-matchup evidence to compare these drafts confidently.";
  } else if (blueCount > redCount) {
    verdict = "More selected lanes show a historical lean toward Blue, but this is not a prediction of the match winner.";
  } else if (redCount > blueCount) {
    verdict = "More selected lanes show a historical lean toward Red, but this is not a prediction of the match winner.";
  } else {
    verdict = "The available lane evidence does not establish a clear overall advantage for either side.";
  }

  return card("Draft-Specific Evidence & Insights", `
    <p><strong>Evidence-based summary</strong></p>
    <p>${esc(verdict)}</p>
    <p><small>${usableCount} of ${laneSignals.length} selected lane matchups
    have at least 30 historical games. Latest patch: ${esc(patch)}.
    This summary counts lane signals; it does not estimate win probability.</small></p>

    <h4>Lane matchup signals</h4>
    ${renderLanes()}

    <div class="report-grid">
      <section>
        <h4>Blue: historical pair signals</h4>
        ${renderSynergies(blueProfile, "Blue")}
      </section>
      <section>
        <h4>Red: historical pair signals</h4>
        ${renderSynergies(redProfile, "Red")}
      </section>
    </div>

    <p><small>Historical win rates describe past professional games, not causal
    champion advantages. Results can vary with patch, player, team, side,
    opponent selection and draft context. The 30-game and 55% thresholds
    are screening rules, not statistical significance tests. Pair results
    do not prove that the champions themselves caused the wins.</small></p>
  `);
}


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
  try {
    if (window.leagueLive && typeof window.leagueLive.getProStats === "function") {
      professionalStats = await window.leagueLive.getProStats();
      professionalStatsError = "";
    } else {
      professionalStats = null;
      professionalStatsError = "Browser mode: professional statistics need to be loaded from a local JSON file."; 
    }
    if ($("report").className !== "report-empty") renderReport();
  } catch (error) {
    professionalStats = null;
    professionalStatsError = "Professional stats unavailable: " + (error.message || "unknown error");
    if ($("report").className !== "report-empty") renderReport();
    console.error("Could not load professional statistics:", error);
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
      .forEach(s => {
        s.value = "";
        const search = s.closest(".slot")?.querySelector(".champion-search");
        if (search) search.value = "";
      });

    ROLES.forEach(r => updateSlot(side, r.key));
    updateTeamSummary(side);updateTeamProgress(side);
  }
document.querySelectorAll(".champion-search").forEach(search => {
  search.value = "";
  search.setAttribute("aria-expanded", "false");
});

document.querySelectorAll(".champion-search-results").forEach(list => {
  list.style.display = "none";
});
  refreshChampionAvailability();

  // Clear visible champion search fields after all reset updates.
  document.querySelectorAll(".champion-search").forEach(search => {
    search.value = "";
    search.defaultValue = "";
    search.setAttribute("aria-expanded", "false");
  });

  document.querySelectorAll(".champion-search-results").forEach(list => {
    list.style.display = "none";
    list.replaceChildren();
  });

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

// Browser-only professional stats file picker
const statsPicker = document.getElementById("proStatsFile");
if (statsPicker) {
  statsPicker.addEventListener("change", async () => {
    const file = statsPicker.files?.[0];
    if (!file) return;
    const status = document.getElementById("statsUploadStatus");
    try {
      const data = JSON.parse(await file.text());
      if (!data || !data.patches || typeof data.patches !== "object") {
        throw new Error("Invalid stats JSON format.");
      }
      professionalStats = data;
      professionalStatsError = "";
      if (status) status.textContent = "Statistics loaded: " + file.name;
      if (document.getElementById("report").className !== "report-empty") renderReport();
    } catch (e) {
      if (status) status.textContent = "Could not load file: " + e.message;
    }
  });
}
