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
