/* Health profile settings: GET and PATCH /api/health-profile. */
(function () {
  "use strict";
  const { esc } = HT;
  const $ = (s) => document.querySelector(s);

  HT.initPage().then(async ({ user }) => {
    const dob = user.dob ? HT.fmtDate(String(user.dob).slice(0, 10)) : "—";
    $("#account").innerHTML = `<div><dt>Name</dt><dd>${esc(user.name)}</dd></div><div><dt>Email</dt><dd>${esc(user.email)}</dd></div><div><dt>Date of birth</dt><dd>${esc(dob)}</dd></div>`;
    const pf = HT.profileForm($("#pfRoot"));
    const titles = { basics: "Body and activity", medical: "Medical background (optional)", consent: "Consent" };
    document.querySelectorAll("#pfRoot [data-section]").forEach((fs) => fs.insertAdjacentHTML("beforebegin", `<h3 class="section-title">${titles[fs.dataset.section]}</h3>`));
    const form = $("#profileForm"), btn = $("#saveBtn");
    let hadConsent = false;

    const loadProfile = async () => {
      form.hidden = true; $("#loading").hidden = false; $("#loadError").hidden = true;
      try {
        const r = await HT.api("/api/health-profile");
        const p = r.data.healthProfile;
        hadConsent = !!(p.consent && p.consent.medicalDataConsent);
        pf.setValues(p);
        form.hidden = false;
      } catch (err) {
        if (err.silent) return;
        $("#loadError").hidden = false;
        $("#loadError").innerHTML = `Couldn't load your profile: ${esc(err.message)} <button class="btn sm" id="retry">Try again</button>`;
        $("#retry").addEventListener("click", loadProfile);
      } finally { $("#loading").hidden = true; }
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Un-ticking consent withdraws it: the medical answers are erased, so only the basics need to be valid.
      const withdrawing = hadConsent && !pf.consentChecked();
      if (pf.validate(withdrawing ? ["basics"] : undefined) !== true) return;
      let body = pf.getValues();
      if (withdrawing) {
        const ok = await HT.confirm({ title: "Withdraw consent?", message: "Your medical conditions and allergies will be permanently removed from your profile.", confirmText: "Withdraw and save", danger: true });
        if (!ok) return;
        body = pf.getValues({ withMedical: false });
      }
      HT.busy(btn, true, "Saving…");
      try {
        const r = await HT.api("/api/health-profile", { method: "PATCH", body });
        const p = r.data.healthProfile;
        hadConsent = !!(p.consent && p.consent.medicalDataConsent);
        pf.setValues(p);
        HT.toast("Health profile updated");
      } catch (err) { HT.formError(form, err, "Couldn't save your profile."); }
      finally { HT.busy(btn, false); }
    });
    loadProfile();
  });
})();
