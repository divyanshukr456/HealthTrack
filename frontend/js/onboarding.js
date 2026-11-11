/* Onboarding wizard: 3 steps, then POST /api/onboarding/health-profile. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const STEPS = [
    { id: "basics", title: "About you", text: "These basics help us set sensible defaults." },
    { id: "medical", title: "Health background", text: "Optional. Answer only what you're comfortable sharing." },
    { id: "consent", title: "Review and finish", text: "Check your answers, then you're ready to start tracking." },
  ];
  let step = 0, pf;

  const show = () => {
    const s = STEPS[step];
    $("#stepTitle").textContent = s.title; $("#stepText").textContent = s.text;
    document.querySelectorAll("#pfRoot [data-section]").forEach((fs) => (fs.hidden = fs.dataset.section !== s.id));
    $("#stepper").innerHTML = STEPS.map((x, i) => `<li class="${i < step ? "done" : i === step ? "current" : ""}" ${i === step ? 'aria-current="step"' : ""}>${x.title}</li>`).join("");
    $("#backBtn").hidden = step === 0;
    $("#nextBtn").hidden = step === STEPS.length - 1;
    $("#finishBtn").hidden = step !== STEPS.length - 1;
    $("#review").hidden = step !== STEPS.length - 1;
    if (step === STEPS.length - 1) $("#review").innerHTML = pf.summary().map(([k, v]) => `<div><dt>${HT.esc(k)}</dt><dd>${HT.esc(v)}</dd></div>`).join("");
    HT.banner($("#wizardForm"), "");
  };

  HT.initPage().then(({ user }) => {
    $("#welcome").textContent = `Welcome, ${user.name.split(/\s+/)[0]}`;
    $("#themeSlot").appendChild(HT.themeButton());
    pf = HT.profileForm($("#pfRoot"));
    const form = $("#wizardForm");
    show();

    $("#nextBtn").addEventListener("click", () => { if (pf.validate([STEPS[step].id]) === true) { step++; show(); window.scrollTo({ top: 0 }); } });
    $("#backBtn").addEventListener("click", () => { step--; show(); });
    $("#logoutBtn").addEventListener("click", async () => {
      try { await HT.api("/api/auth/logout", { method: "POST", noRedirect: true }); } catch (e) {}
      location.replace("login.html");
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (step < STEPS.length - 1) return $("#nextBtn").click();
      const result = pf.validate();
      if (result !== true) {
        const keys = Object.keys(result);
        step = keys.some((k) => ["gender", "activityLevel", "height", "weight"].includes(k)) ? 0 : keys.some((k) => !k.startsWith("consent")) ? 1 : 2;
        show(); pf.validate(); return;
      }
      const btn = $("#finishBtn");
      HT.busy(btn, true, "Saving…");
      try {
        await HT.api("/api/onboarding/health-profile", { method: "POST", body: pf.getValues() });
        HT.toast("Profile saved. Welcome aboard!");
        location.replace("dashboard.html");
      } catch (err) {
        HT.busy(btn, false);
        if (err.status === 409) return location.replace("dashboard.html"); // profile already exists
        HT.formError(form, err, "Couldn't save your profile.");
      }
    });
  });
})();
