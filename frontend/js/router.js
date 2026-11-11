// index.html: send people to the right place based on their session and onboarding status.
(async function () {
  try {
    const me = await HT.api("/api/auth/me", { noRedirect: true });
    location.replace(me.data.onboarding.completed ? "dashboard.html" : "onboarding.html");
  } catch (e) {
    if (e.status === 401) location.replace("login.html");
    else document.body.innerHTML = '<div style="min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center"><div class="stack" style="max-width:380px;align-items:center"><h1>We couldn\'t reach HealthTrack</h1><p class="muted">' + HT.esc(e.message) + '</p><button class="btn primary" onclick="location.reload()">Try again</button></div></div>';
  }
})();
