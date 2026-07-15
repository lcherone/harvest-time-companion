export const managerLockHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>HarvestTime</title>
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="/setup/assets/lock.css" />
  </head>
  <body>
    <main>
      <section class="lock-screen" aria-live="polite">
        <div class="lock-visual" role="img" aria-label="HarvestTime">
          <svg class="lock-logo" viewBox="0 0 128 128" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="locked-leaf-large" x1="48" y1="84" x2="106" y2="16" gradientUnits="userSpaceOnUse"><stop stop-color="#2b6049" /><stop offset="1" stop-color="#39785a" /></linearGradient>
              <linearGradient id="locked-leaf-small" x1="22" y1="96" x2="62" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#3d7659" /><stop offset="1" stop-color="#67a07a" /></linearGradient>
            </defs>
            <path d="M59 74C58 43 72 19 108 12c3 35-8 59-39 68-5 1-8-1-10-6Z" fill="url(#locked-leaf-large)" />
            <path d="M54 99C29 99 14 85 12 60c25-1 43 10 48 31 1 5-1 8-6 8Z" fill="url(#locked-leaf-small)" />
            <path d="M57 108c1-31 14-55 36-76" fill="none" stroke="#24543f" stroke-linecap="round" stroke-width="7" />
            <path d="M57 108c-5-20-16-31-34-38" fill="none" stroke="#24543f" stroke-linecap="round" stroke-width="7" />
          </svg>
        </div>
        <div class="lock-content">
          <p class="wordmark">HarvestTime</p>
          <h1>Open this page from HarvestTime</h1>
          <p class="instructions">This page stays private until HarvestTime opens it for you. In the extension, choose <strong>Settings</strong>, then <strong>Open companion manager</strong>.</p>
          <div class="status">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            <p id="lock-detail">A secure extension session is required.</p>
          </div>
        </div>
      </section>
    </main>
    <script src="/setup/assets/lock.js" defer></script>
  </body>
</html>`;
export const managerLockCss = `:root {
  color: #0b1730;
  background: #fff;
  font-family: Inter, "SF Pro Text", Aptos, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
}

* { box-sizing: border-box; }

body { margin: 0; min-width: 320px; }

main {
  min-height: 100vh;
  padding: 0 32px;
}

.lock-screen {
  width: min(1050px, 100%);
  min-height: 100vh;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(260px, 0.78fr) minmax(0, 1.22fr);
  gap: clamp(48px, 7vw, 104px);
  align-items: center;
  padding: clamp(64px, 9vh, 112px) 0;
}

.lock-visual {
  position: relative;
  display: grid;
  width: min(100%, 340px);
  aspect-ratio: 1;
  justify-self: end;
  place-items: center;
  border-radius: 50%;
  background: #eef5ef;
}

.lock-visual::before,
.lock-visual::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  background: #dcecdf;
}

.lock-visual::before { top: 4%; right: 5%; width: 22px; height: 22px; }
.lock-visual::after { bottom: 12%; left: 1%; width: 12px; height: 12px; }

.lock-logo {
  width: 58%;
  height: 58%;
  filter: drop-shadow(0 18px 24px rgba(20, 74, 49, 0.12));
}

.lock-content { max-width: 610px; }

.wordmark {
  margin: 0 0 20px;
  color: #0f5035;
  font-size: 16px;
  font-weight: 820;
  letter-spacing: 0.01em;
}

h1 {
  max-width: 590px;
  margin: 0;
  color: #111c35;
  font-size: clamp(42px, 5.2vw, 74px);
  font-weight: 820;
  line-height: 0.98;
  letter-spacing: -0.055em;
}

.instructions {
  max-width: 570px;
  margin: 26px 0 0;
  color: #495971;
  font-size: clamp(16px, 1.4vw, 18px);
  line-height: 1.7;
}

.status {
  max-width: 570px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 13px;
  align-items: center;
  margin-top: 32px;
  border-top: 1px solid #b9ccb9;
  padding-top: 22px;
}

.status svg {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  padding: 6px;
  color: #0f5035;
  background: #eef5ef;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.status p {
  margin: 0;
  color: #0f5035;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}

@media (max-width: 800px) {
  main { padding: 0 24px; }

  .lock-screen {
    width: min(620px, 100%);
    grid-template-columns: 1fr;
    gap: 40px;
    align-content: center;
    justify-items: center;
    padding: 56px 0 72px;
    text-align: center;
  }

  .lock-visual { width: min(240px, 54vw); justify-self: center; }
  .lock-content { max-width: 580px; }
  h1 { font-size: clamp(40px, 9vw, 64px); }
  .instructions, .status { margin-inline: auto; }
  .status { text-align: left; }
}

@media (max-width: 520px) {
  main { padding: 0 16px; }

  .lock-screen { gap: 32px; padding: 40px 0 52px; }
  .lock-visual { width: min(180px, 52vw); }
  .wordmark { margin-bottom: 14px; }
  h1 { font-size: clamp(34px, 11vw, 48px); line-height: 1; }
  .instructions { margin-top: 19px; font-size: 15px; line-height: 1.6; }
  .status { margin-top: 24px; }
}

`;
export const managerLockJs = `(() => {
  "use strict";

  const detail = document.querySelector("#lock-detail");
  const token = location.hash.slice(1);

  if (!token) return;

  history.replaceState(null, "", location.pathname + location.search);
  detail.textContent = "Checking the secure extension session…";

  void fetch("/api/admin/session/exchange", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token })
  }).then((response) => {
    if (!response.ok) throw new Error("invalid session");
    location.replace(location.pathname + location.search);
  }).catch(() => {
    detail.textContent = "This secure link is missing, expired, or has already been used.";
  });
})();`;
