/* Login and registration. Passwords live only in the form field and the request body: never in storage. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const page = document.body.dataset.page;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const go = (onboarding) => location.replace(onboarding && onboarding.completed ? "dashboard.html" : "onboarding.html");

  const wirePasswordToggles = () => {
    document.querySelectorAll("[data-toggle-pw]").forEach((b) =>
      b.addEventListener("click", () => {
        const input = document.getElementById(b.dataset.togglePw);
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        b.textContent = show ? "Hide" : "Show";
        b.setAttribute("aria-pressed", String(show));
      })
    );
  };

  /* ---------------- login ---------------- */
  const initLogin = () => {
    const form = $("#loginForm"), btn = $("#submitBtn");
    if (new URLSearchParams(location.search).get("registered")) {
      const ok = $("#notice"); ok.hidden = false; ok.textContent = "Account created. Log in to continue.";
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      HT.clearErrors(form);
      const email = form.email.value.trim(), password = form.password.value;
      const errors = {};
      if (!email) errors.email = "Enter your email"; else if (!EMAIL.test(email)) errors.email = "Enter a valid email address";
      if (!password) errors.password = "Enter your password";
      if (Object.keys(errors).length) return void HT.showErrors(form, errors);
      HT.busy(btn, true, "Logging in…");
      try {
        const r = await HT.api("/api/auth/login", { method: "POST", body: { email, password }, noRedirect: true });
        go(r.data.onboarding);
      } catch (err) {
        HT.busy(btn, false);
        HT.formError(form, err, "Couldn't log in.");
        if (err.status === 401) { form.password.value = ""; form.password.focus(); }
      }
    });
  };

  /* ---------------- register ---------------- */
  const RULES = [
    ["len", "At least 8 characters", (p) => p.length >= 8],
    ["low", "A lowercase letter", (p) => /[a-z]/.test(p)],
    ["up", "An uppercase letter", (p) => /[A-Z]/.test(p)],
    ["num", "A number", (p) => /[0-9]/.test(p)],
  ];
  const initRegister = () => {
    const form = $("#registerForm"), btn = $("#submitBtn");
    const maxDob = new Date(); maxDob.setFullYear(maxDob.getFullYear() - 13);
    form.dob.max = HT.dateStr(maxDob);
    $("#rules").innerHTML = RULES.map(([id, text]) => `<li id="r_${id}">${text}</li>`).join("");
    form.password.addEventListener("input", () => RULES.forEach(([id, , test]) => $("#r_" + id).classList.toggle("ok", test(form.password.value))));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      HT.clearErrors(form);
      const name = form.elements.name.value.trim(), email = form.email.value.trim(), dob = form.dob.value, password = form.password.value, confirm = form.confirm.value;
      const errors = {};
      if (name.length < 2) errors.name = "Name must be at least 2 characters"; else if (name.length > 50) errors.name = "Name must be 50 characters or fewer";
      if (!email) errors.email = "Enter your email"; else if (!EMAIL.test(email)) errors.email = "Enter a valid email address";
      if (!dob) errors.dob = "Enter your date of birth"; else if (dob > form.dob.max) errors.dob = "You must be at least 13 years old";
      const failed = RULES.filter(([, , t]) => !t(password));
      if (!password) errors.password = "Create a password"; else if (failed.length) errors.password = `Password needs: ${failed.map((f) => f[1].toLowerCase()).join(", ")}`; else if (password.length > 72) errors.password = "Use 72 characters or fewer";
      if (!errors.password && confirm !== password) errors.confirm = "Passwords don't match";
      if (Object.keys(errors).length) return void HT.showErrors(form, errors);

      HT.busy(btn, true, "Creating account…");
      try {
        await HT.api("/api/auth/register", { method: "POST", body: { name, email, password, dob }, noRedirect: true });
      } catch (err) {
        HT.busy(btn, false);
        if (err.status === 409) { HT.showErrors(form, { email: "That email is already registered. Try logging in instead." }); return; }
        return void HT.formError(form, err, "Couldn't create your account.");
      }
      // Registration doesn't start a session, so log in straight away with the same credentials.
      try {
        const r = await HT.api("/api/auth/login", { method: "POST", body: { email, password }, noRedirect: true });
        go(r.data.onboarding);
      } catch (err) { location.replace("login.html?registered=1"); }
    });
  };

  wirePasswordToggles();
  const slot = $("#themeSlot"); if (slot) slot.appendChild(HT.themeButton());
  HT.redirectIfAuthed().then(() => (page === "login" ? initLogin() : initRegister()));
})();
