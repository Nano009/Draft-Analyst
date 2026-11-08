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
