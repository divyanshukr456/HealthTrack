/* Health profile form, shared by onboarding (step by step) and Health profile settings (all at once). */
(function () {
  "use strict";
  const { esc } = HT;
  const GENDERS = [["female", "Female"], ["male", "Male"], ["other", "Other"], ["prefer_not_to_say", "Prefer not to say"]];
  const LEVELS = [
    ["sedentary", "Sedentary: little or no exercise"], ["light", "Light: exercise 1–3 days a week"], ["moderate", "Moderate: exercise 3–5 days a week"],
    ["active", "Active: exercise 6–7 days a week"], ["very_active", "Very active: hard daily exercise or a physical job"],
  ];
  const ALLERGY_TYPES = [["food", "Food"], ["medicine", "Medicine"], ["environmental", "Environmental"]];
  const radios = (name) => ["yes", "no", "unsure"].map((v, i) => `<label class="choice"><input type="radio" name="${name}" value="${v}"><span>${["Yes", "No", "Not sure"][i]}</span></label>`).join("");
  const options = (list) => list.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("");

  HT.profileForm = (root) => {
    root.innerHTML = `
      <fieldset class="section" data-section="basics">
        <div class="grid-2">
          <div class="field" data-field="gender"><label for="pf_gender">Gender</label><select id="pf_gender" name="gender"><option value="">Select…</option>${options(GENDERS)}</select><small class="field-error" role="alert"></small></div>
          <div class="field" data-field="activityLevel"><label for="pf_activity">Activity level</label><select id="pf_activity" name="activityLevel"><option value="">Select…</option>${options(LEVELS)}</select><small class="field-error" role="alert"></small></div>
          <div class="field" data-field="height"><label for="pf_height">Height (cm)</label><input id="pf_height" name="height" type="number" inputmode="decimal" step="any" placeholder="e.g. 170"><small class="field-error" role="alert"></small></div>
          <div class="field" data-field="weight"><label for="pf_weight">Weight (kg)</label><input id="pf_weight" name="weight" type="number" inputmode="decimal" step="any" placeholder="e.g. 68"><small class="field-error" role="alert"></small></div>
        </div>
      </fieldset>
      <fieldset class="section" data-section="medical">
        <div class="field" data-field="medicalStatus"><span class="label">Do you have any medical conditions?</span><div class="choices">${radios("medicalStatus")}</div><small class="field-error" role="alert"></small></div>
        <div class="field" data-field="medicalConditions" id="pf_condWrap" hidden><label for="pf_cond">Your conditions</label>
          <div class="inline"><input id="pf_cond" type="text" maxlength="100" placeholder="e.g. Asthma" autocomplete="off"><button type="button" class="btn" id="pf_addCond">Add</button></div>
          <div class="chips" id="pf_chips"></div><small class="field-error" role="alert"></small></div>
        <div class="field" data-field="allergies.hasAllergies"><span class="label">Do you have any allergies?</span><div class="choices">${radios("hasAllergies")}</div><small class="field-error" role="alert"></small></div>
        <div class="field" data-field="allergies.items" id="pf_allergyWrap" hidden><span class="label">Your allergies</span><div class="stack" id="pf_rows"></div>
          <div><button type="button" class="btn sm" id="pf_addAllergy">Add an allergy</button></div><small class="field-error" role="alert"></small></div>
      </fieldset>
      <fieldset class="section" data-section="consent">
        <div class="field" data-field="consent.medicalDataConsent">
          <label class="check"><input type="checkbox" name="consent" id="pf_consent"><span>I agree that HealthTrack may store the medical and allergy information I entered. I can withdraw this at any time in Health profile, which removes that information.</span></label>
          <small class="field-error" role="alert"></small></div>
        <p class="hint" id="pf_consentNote"></p>
      </fieldset>`;

    const $ = (s) => root.querySelector(s);
    const state = { conditions: [], allergies: [] };
    const radio = (name) => { const r = root.querySelector(`input[name="${name}"]:checked`); return r ? r.value : null; };
    const setRadio = (name, v) => root.querySelectorAll(`input[name="${name}"]`).forEach((r) => (r.checked = r.value === v));

    const drawChips = () => {
      $("#pf_chips").innerHTML = state.conditions.map((c, i) => `<span class="chip">${esc(c)}<button type="button" data-i="${i}" aria-label="Remove ${esc(c)}">×</button></span>`).join("");
    };
    const drawRows = () => {
      $("#pf_rows").innerHTML = state.allergies.map((a, i) => `<div class="allergy-row" data-field="allergies.items.${i}">
        <input type="text" data-k="name" data-i="${i}" value="${esc(a.name)}" maxlength="100" placeholder="e.g. Peanuts" aria-label="Allergy name" autocomplete="off">
        <select data-k="type" data-i="${i}" aria-label="Allergy type">${options(ALLERGY_TYPES)}</select>
        <button type="button" class="icon-btn danger" data-rm="${i}" aria-label="Remove allergy">${HT.icon("trash")}</button><small class="field-error" role="alert"></small></div>`).join("");
      $("#pf_rows").querySelectorAll("select").forEach((s) => (s.value = state.allergies[s.dataset.i].type));
    };
    const addCondition = () => {
      const input = $("#pf_cond"), v = input.value.trim();
      if (!v) return;
      if (state.conditions.length >= 20) return HT.showErrors(root, { medicalConditions: "You can add up to 20 conditions" });
      if (!state.conditions.some((c) => c.toLowerCase() === v.toLowerCase())) state.conditions.push(v);
      input.value = ""; drawChips(); refresh(); input.focus();
    };
    const effective = () => {
      const status = radio("medicalStatus"), has = radio("hasAllergies");
      return {
        medicalStatus: status, medicalConditions: status === "yes" ? state.conditions.slice() : [],
        allergies: { hasAllergies: has, items: has === "yes" ? state.allergies.map((a) => ({ name: a.name.trim(), type: a.type })) : [] },
      };
    };
    const hasMedicalInfo = () => { const e = effective(); return e.medicalStatus !== null || e.allergies.hasAllergies !== null; };
    const refresh = () => {
      $("#pf_condWrap").hidden = radio("medicalStatus") !== "yes";
      $("#pf_allergyWrap").hidden = radio("hasAllergies") !== "yes";
      $("#pf_consentNote").textContent = hasMedicalInfo()
        ? "You answered medical questions, so we need your consent to store them."
        : "You haven't answered the medical questions, so there's nothing to consent to. You can add them later.";
    };

    root.addEventListener("change", refresh);
    root.addEventListener("click", (e) => {
      if (e.target.id === "pf_addCond") addCondition();
      const chip = e.target.closest("[data-i]");
      if (chip && chip.closest("#pf_chips")) { state.conditions.splice(Number(chip.dataset.i), 1); drawChips(); refresh(); }
      if (e.target.id === "pf_addAllergy") { if (state.allergies.length < 30) { state.allergies.push({ name: "", type: "food" }); drawRows(); refresh(); const ins = $("#pf_rows").querySelectorAll("input"); ins[ins.length - 1].focus(); } }
      const rm = e.target.closest("[data-rm]");
      if (rm) { state.allergies.splice(Number(rm.dataset.rm), 1); drawRows(); refresh(); }
    });
    root.addEventListener("input", (e) => { const t = e.target; if (t.dataset && t.dataset.k) state.allergies[t.dataset.i][t.dataset.k] = t.value; });
    root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "pf_cond") { e.preventDefault(); addCondition(); } });

    const api = {
      hasMedicalInfo,
      consentChecked: () => $("#pf_consent").checked,
      setValues(p) {
        $("#pf_gender").value = p.gender; $("#pf_activity").value = p.activityLevel;
        $("#pf_height").value = p.height; $("#pf_weight").value = p.weight;
        setRadio("medicalStatus", p.medicalStatus); setRadio("hasAllergies", p.allergies && p.allergies.hasAllergies);
        state.conditions = (p.medicalConditions || []).slice();
        state.allergies = ((p.allergies && p.allergies.items) || []).map((a) => ({ name: a.name, type: a.type }));
        $("#pf_consent").checked = !!(p.consent && p.consent.medicalDataConsent);
        drawChips(); drawRows(); refresh();
      },
      // Validates the named sections and shows messages inline. Returns true when everything is valid.
      validate(sections = ["basics", "medical", "consent"]) {
        HT.clearErrors(root);
        const errors = {};
        if (sections.includes("basics")) {
          const v = (n) => $(`[name="${n}"]`).value.trim();
          if (!v("gender")) errors.gender = "Choose a gender option";
          if (!v("activityLevel")) errors.activityLevel = "Choose your activity level";
          const h = Number(v("height")), w = Number(v("weight"));
          if (!v("height") || !Number.isFinite(h)) errors.height = "Enter your height in cm";
          else if (h < 50 || h > 272) errors.height = "Height must be between 50 and 272 cm";
          if (!v("weight") || !Number.isFinite(w)) errors.weight = "Enter your weight in kg";
          else if (w < 2 || w > 700) errors.weight = "Weight must be between 2 and 700 kg";
        }
        if (sections.includes("medical")) {
          if ($("#pf_cond").value.trim()) errors.medicalConditions = "Press Add to include this condition, or clear the box";
          if (radio("hasAllergies") === "yes") {
            const bad = state.allergies.findIndex((a) => !a.name.trim());
            if (bad >= 0) errors[`allergies.items.${bad}`] = "Enter the allergy name or remove this row";
            else if (!state.allergies.length) errors["allergies.items"] = "Add at least one allergy, or choose No or Not sure";
          }
        }
        if (sections.includes("consent") && hasMedicalInfo() && !$("#pf_consent").checked) {
          errors["consent.medicalDataConsent"] = "Please agree to store your medical answers, or clear them in the previous step";
        }
        HT.showErrors(root, errors);
        return Object.keys(errors).length === 0 ? true : errors;
      },
      // Payload for the API. `withMedical:false` sends only the basics (used when consent is withdrawn).
      getValues({ withMedical = true } = {}) {
        const v = (n) => $(`[name="${n}"]`).value.trim();
        const basics = { gender: v("gender"), height: Number(v("height")), weight: Number(v("weight")), activityLevel: v("activityLevel") };
        if (!withMedical) return { ...basics, consent: { medicalDataConsent: false } };
        return { ...basics, ...effective(), consent: { medicalDataConsent: hasMedicalInfo() && $("#pf_consent").checked } };
      },
      summary() {
        const e = effective(), label = (list, v) => (list.find((x) => x[0] === v) || [, v])[1];
        const yn = (s) => (s === "yes" ? "Yes" : s === "no" ? "No" : s === "unsure" ? "Not sure" : "Not answered");
        return [
          ["Gender", label(GENDERS, $("#pf_gender").value)], ["Activity level", label(LEVELS, $("#pf_activity").value).split(":")[0]],
          ["Height", `${$("#pf_height").value} cm`], ["Weight", `${$("#pf_weight").value} kg`],
          ["Medical conditions", e.medicalStatus === "yes" ? e.medicalConditions.join(", ") || "Yes" : yn(e.medicalStatus)],
          ["Allergies", e.allergies.hasAllergies === "yes" ? e.allergies.items.map((a) => a.name).join(", ") || "Yes" : yn(e.allergies.hasAllergies)],
        ];
      },
    };
    refresh();
    return api;
  };
})();
