export const managerCss = `:root {
  color-scheme: light;
  --ink: #111c35;
  --ink-strong: #12351f;
  --muted: #495971;
  --line: #d7e0d8;
  --line-strong: #b9ccb9;
  --soft: #f7faf7;
  --sage: #eef5ef;
  --green: #176b45;
  --green-bright: #2f7d4f;
  --green-dark: #0f5035;
  --white: #ffffff;
  --danger: #9d342f;
  --warning: #cf8500;
  --info: #2a69b8;
  font-family:
    Inter,
    "SF Pro Text",
    Aptos,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  font-synthesis: none;
  line-height: 1.45;
}

* {
  box-sizing: border-box;
}

html {
  min-width: 320px;
  background: var(--white);
}

body {
  margin: 0;
  min-width: 320px;
  color: var(--ink);
  background: var(--white);
}

a {
  color: var(--green-dark);
  text-underline-offset: 3px;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  min-height: 44px;
  border: 1px solid var(--green);
  border-radius: 4px;
  padding: 0.7rem 1.15rem;
  color: white;
  background: var(--green);
  font-weight: 760;
  cursor: pointer;
}

button:hover {
  background: var(--green-dark);
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid rgb(42 105 184 / 0.25);
  outline-offset: 2px;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid #97a9a0;
  border-radius: 4px;
  padding: 0.78rem 0.85rem;
  color: var(--ink);
  background: var(--white);
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--info);
  box-shadow: 0 0 0 2px rgb(42 105 184 / 0.13);
}

textarea {
  resize: vertical;
}

code {
  border-radius: 3px;
  padding: 0.1rem 0.28rem;
  color: #264b40;
  background: #edf2ef;
  font-size: 0.86em;
  overflow-wrap: anywhere;
}

.is-hidden {
  display: none !important;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.site-header {
  position: relative;
  z-index: 20;
  min-height: 76px;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0;
  padding: 0 2rem;
  border-bottom: 1px solid var(--line-strong);
  background: rgb(255 255 255 / 0.98);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--ink-strong);
  font-size: 1.65rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  text-decoration: none;
}

.brand-mark {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  overflow: visible;
}

.main-nav {
  justify-self: start;
  align-self: stretch;
  display: flex;
  align-items: stretch;
  gap: clamp(1.25rem, 2vw, 2.5rem);
  padding-left: 0.4rem;
}

.main-nav a {
  position: relative;
  display: inline-flex;
  align-items: center;
  border-bottom: 0;
  padding: 0.2rem 0 0;
  color: var(--ink);
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
}

.main-nav a:hover,
.main-nav a.is-active {
  color: var(--green-dark);
}

.main-nav a::after {
  content: "";
  position: absolute;
  right: -1.2rem;
  bottom: 0;
  left: -1.2rem;
  height: 4px;
  background: transparent;
}

.main-nav a:hover::after,
.main-nav a.is-active::after {
  background: var(--green-bright);
}

.header-links {
  display: flex;
  gap: 1.5rem;
  justify-content: flex-end;
}

.header-links a {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--green-dark);
  font-size: 1rem;
  font-weight: 650;
  text-decoration: none;
  white-space: nowrap;
}

.store-mark {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  overflow: visible;
}

.github-mark {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

.external-mark {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.menu-toggle {
  display: none;
}

.app-shell {
  min-height: calc(100vh - 76px);
}

.manager {
  width: min(1440px, 100%);
  min-height: calc(100vh - 76px);
  margin-inline: auto;
  display: grid;
  grid-template-columns: 240px minmax(0, 780px) minmax(280px, 1fr);
  grid-template-rows: auto auto;
  border-inline: 1px solid var(--line);
}

.manager[data-page="setup"] {
  grid-template-rows: minmax(652px, auto) auto;
}

.step-rail,
.help-rail {
  background: var(--white);
}

.step-rail {
  grid-column: 1;
  grid-row: 1;
  padding: 2.1rem 0.8rem 2.7rem;
  border-right: 1px solid var(--line);
}

.local-note {
  display: none;
}

.step-rail-heading {
  margin: 0 0.75rem 1.1rem;
  padding: 0 0.25rem 0.8rem;
  border-bottom: 1px solid var(--line);
}

.step-rail-heading .eyebrow {
  margin-bottom: 0.25rem;
}

.step-rail-heading > span {
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 650;
  line-height: 1.35;
}

.help-rail {
  grid-column: 3;
  grid-row: 1;
  padding: 3.25rem 2.15rem 3rem;
  border-left: 1px solid var(--line);
}

.eyebrow,
.service-kicker {
  display: block;
  margin: 0 0 0.45rem;
  color: var(--green);
  font-size: 0.7rem;
  font-weight: 850;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.page > .eyebrow,
.help-rail .eyebrow {
  display: none;
}

.step-rail ol {
  display: grid;
  gap: 0.3rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step-rail li {
  position: relative;
  min-height: 64px;
  border-left: 4px solid transparent;
}

.step-rail li > a {
  min-height: inherit;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 14px;
  gap: 0.6rem;
  align-items: center;
  padding: 0.45rem 0.55rem 0.45rem 0.75rem;
  color: inherit;
  text-decoration: none;
}

.step-rail li > a > svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: var(--muted);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
  transition: transform 160ms ease;
}

.step-rail li > a:hover > svg,
.step-rail li > a:focus-visible > svg {
  transform: translateX(2px);
}

.step-rail li > a:focus-visible {
  outline: 3px solid rgb(47 126 86 / 0.2);
  outline-offset: -3px;
}

.step-rail li:not(:last-child)::after {
  display: none;
}

.step-rail li > a > span,
.mobile-progress li > span {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--green-bright);
  border-radius: 50%;
  color: var(--ink);
  background: var(--white);
  font-size: 0.9rem;
  font-weight: 780;
}

.step-rail li.is-complete > a > span,
.mobile-progress li.is-complete > span {
  color: var(--ink);
  border-color: var(--green-bright);
  background: var(--white);
}

.step-rail li.is-current {
  border-left-color: var(--green-bright);
  background: linear-gradient(90deg, #eaf2ea 0%, #f4f8f4 100%);
}

.step-rail li.is-current > a > span,
.mobile-progress li.is-current > span {
  color: white;
  border-color: var(--green);
  background: var(--green);
  box-shadow: 0 5px 16px rgb(23 107 69 / 0.18);
}

.step-rail strong,
.step-rail small {
  display: block;
}

.step-rail strong {
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 700;
}

.step-rail li.is-current strong {
  color: var(--green-dark);
}

.step-rail small {
  margin-top: 0.15rem;
  color: var(--muted);
  font-size: 0.67rem;
  font-weight: 580;
  line-height: 1.25;
}

.step-rail li.is-current small {
  color: #3f6657;
}

.progress-reason {
  margin: 1rem 0.75rem 0;
  border: 1px solid #c9ddce;
  border-radius: 6px;
  padding: 0.85rem;
  background: #f3f8f4;
}

.progress-reason strong {
  color: var(--green-dark);
  font-size: 0.8rem;
  line-height: 1.35;
}

.progress-reason p {
  margin: 0.4rem 0 0.65rem;
  color: #405a50;
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.45;
}

.progress-reason a {
  color: var(--green-dark);
  font-size: 0.7rem;
  font-weight: 750;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.local-note {
  padding: 1rem;
  border-left: 3px solid var(--green);
  background: var(--sage);
}

.local-note p {
  margin: 0.45rem 0 0;
  color: #486159;
  font-size: 0.8rem;
  line-height: 1.5;
}

.content {
  grid-column: 2;
  grid-row: 1;
  width: 100%;
  padding: 1.75rem 2.25rem 1.1rem;
}

.manager[data-page="setup"] .content {
  padding-bottom: 0.6rem;
}

.setup-intro h1,
.page > h1,
.history-heading h1 {
  margin: 0 0 0.45rem;
  color: var(--ink);
  font-size: clamp(2.05rem, 3vw, 2.4rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.035em;
}

.lede {
  max-width: 680px;
  margin: 0 0 1.6rem;
  color: #263550;
  font-size: 1rem;
  line-height: 1.55;
}

.mobile-progress {
  display: none;
}

.setup-intro {
  margin-bottom: 1.55rem;
  padding-bottom: 1.45rem;
  border-bottom: 1px solid var(--line-strong);
}

.setup-intro h1 {
  margin-bottom: 0.35rem;
}

.setup-intro .lede {
  margin: 0;
}

.harvest-setup {
  margin: 0;
}

.setup-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.setup-section-heading h2 {
  margin: 0;
  color: var(--ink);
  font-size: 1.55rem;
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.setup-copy {
  max-width: 700px;
  margin: 0.65rem 0 0;
  color: #263550;
  font-size: 1rem;
  line-height: 1.55;
}

.mobile-setup-copy {
  display: none;
}

.developer-link {
  width: fit-content;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  margin-top: 1.35rem;
  border: 1px solid #fa5d00;
  border-radius: 6px;
  padding: 0.7rem 1rem;
  color: #fff;
  background: #fa5d00;
  box-shadow: 0 4px 12px rgb(189 70 0 / 0.24);
  font-size: 1rem;
  font-weight: 760;
  text-decoration: none;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.developer-link:hover {
  border-color: #e85500;
  color: #fff;
  background: #e85500;
  box-shadow: 0 6px 16px rgb(189 70 0 / 0.3);
  transform: translateY(-1px);
}

.developer-link:active {
  box-shadow: 0 2px 6px rgb(189 70 0 / 0.24);
  transform: translateY(1px);
}

.developer-link:focus-visible {
  outline-color: rgb(29 30 28 / 0.32);
}

.developer-link .harvest-logo {
  flex: 0 0 auto;
  width: 27px;
  height: 27px;
  fill: currentColor;
}

.developer-link .developer-link-arrow {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  margin-left: 0.1rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.9;
  opacity: 0.88;
}

.setup-primary-action svg,
.advanced-oauth summary svg,
.secure-input svg,
.select-wrap svg {
  flex: 0 0 auto;
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.85;
}

.setup-form-area {
  margin-top: 1.4rem;
}

.setup-form-area .form-stack {
  gap: 0.45rem;
  margin-top: 0.7rem;
}

.setup-form-area .form-stack label {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 650;
}

.label-help {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  margin-left: 0.35rem;
  border: 1px solid #68758a;
  border-radius: 50%;
  color: #45536a;
  font-size: 0.72rem;
  line-height: 1;
  vertical-align: 1px;
}

.secure-input,
.select-wrap {
  position: relative;
}

.secure-input input,
.select-wrap select {
  min-height: 48px;
  border-color: #778496;
  border-radius: 4px;
  padding: 0.7rem 3.25rem 0.7rem 1rem;
  font-size: 1rem;
}

.secure-input input:focus,
.select-wrap select:focus {
  border-color: #2f70c8;
  box-shadow: 0 0 0 3px rgb(47 112 200 / 0.18);
}

.visibility-toggle {
  position: absolute;
  top: 50%;
  right: 0.55rem;
  width: 40px;
  min-height: 40px;
  display: grid;
  place-items: center;
  translate: 0 -50%;
  border: 0;
  padding: 0;
  color: var(--ink);
  background: transparent;
}

.visibility-toggle:hover {
  color: var(--green-dark);
  background: var(--soft);
}

.visibility-toggle .eye-closed,
.visibility-toggle[aria-pressed="true"] .eye-open {
  display: none;
}

.visibility-toggle[aria-pressed="true"] .eye-closed {
  display: block;
}

.select-wrap select {
  appearance: none;
}

.select-wrap > svg {
  position: absolute;
  top: 50%;
  right: 0.9rem;
  width: 18px;
  height: 18px;
  translate: 0 -50%;
  pointer-events: none;
}

.select-wrap select:disabled {
  color: #6d788b;
  background: var(--white);
  opacity: 1;
}

.setup-primary-action {
  min-width: 268px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  margin-top: 1.15rem;
  border-color: #246a31;
  border-radius: 4px;
  padding: 0.65rem 1.25rem;
  background: linear-gradient(135deg, #367731 0%, #1d672f 100%);
  font-size: 1rem;
  font-weight: 700;
}

.setup-primary-action:hover {
  background: linear-gradient(135deg, #2d692b 0%, #155529 100%);
}

.advanced-oauth {
  margin-top: 1rem;
  border-top: 1px solid transparent;
}

.advanced-oauth summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  color: var(--ink);
  font-size: 0.98rem;
  font-weight: 650;
  cursor: pointer;
  list-style: none;
}

.advanced-oauth summary::-webkit-details-marker {
  display: none;
}

.advanced-oauth summary svg {
  order: -1;
  width: 17px;
  height: 17px;
  rotate: -90deg;
  transition: rotate 160ms ease;
}

.advanced-oauth[open] summary svg {
  rotate: 0deg;
}

.advanced-oauth p {
  margin: 0 0 0.75rem 1.8rem;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.55;
}

.harvest-setup > .developer-link,
.harvest-setup > .setup-form-area,
.harvest-setup > .connected-summary,
.harvest-setup > .advanced-oauth {
  margin-top: 1.25rem;
}

.notice {
  position: sticky;
  z-index: 5;
  top: 0.75rem;
  margin: 0 0 1rem;
  padding: 0.8rem 1rem;
  border: 1px solid #8bb9a8;
  color: #174c3d;
  background: #edf7f2;
  box-shadow: 0 6px 18px rgb(18 55 44 / 0.08);
}

.notice.is-error {
  border-color: #d1a19e;
  color: #752924;
  background: #fff1f0;
}

.panel {
  margin: 0;
  padding: 1.45rem 0 2rem;
  border: 0;
  border-top: 1px solid var(--line-strong);
  background: transparent;
}

.secondary-panel {
  padding-top: 1.8rem;
}

.panel h2,
.connection-overview h2 {
  margin: 0;
  color: var(--ink);
  font-size: 1.45rem;
  font-weight: 810;
  letter-spacing: -0.015em;
}

.panel > p {
  color: var(--muted);
  line-height: 1.6;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.panel-heading h2 {
  margin: 0;
}

.status-badge {
  flex: 0 0 auto;
  padding: 0.3rem 0.55rem;
  border: 1px solid #82af9f;
  border-radius: 999px;
  color: var(--green-dark);
  background: #e7f3ed;
  font-size: 0.7rem;
  font-weight: 800;
}

.status-badge.subtle {
  color: #53665f;
  border-color: #c9d3cf;
  background: var(--soft);
}

.status-badge.is-error {
  color: #7e302b;
  border-color: #daa6a2;
  background: #fff0ef;
}

.instruction {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
  margin: 1rem 0 1.25rem;
  padding: 0.95rem 1rem;
  border: 1px solid var(--line);
  background: var(--white);
}

.instruction > span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--green);
  border-radius: 50%;
  color: var(--green-dark);
  background: var(--white);
  font-size: 0.76rem;
  font-weight: 800;
}

.instruction p {
  margin: 0.17rem 0;
  line-height: 1.5;
}

.form-stack {
  display: grid;
  gap: 0.62rem;
  margin-top: 1rem;
}

.form-stack label {
  margin-top: 0.45rem;
  color: var(--ink);
  font-size: 0.88rem;
  font-weight: 760;
}

.form-stack label small {
  color: var(--muted);
  font-weight: 500;
}

.input-action {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.65rem;
}

.input-action button {
  min-width: 145px;
}

.field-help,
.form-footer p {
  margin: 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.form-footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-top: 0.8rem;
}

.connected-summary {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 1rem;
  border: 1px solid #b7d2c7;
  background: #edf7f2;
}

.connected-summary .check {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: white;
  background: var(--green);
  font-weight: 800;
}

.connected-summary p {
  margin: 0.2rem 0 0;
  color: var(--muted);
  font-size: 0.85rem;
}

.callout {
  margin-top: 1rem;
  padding: 1rem;
  border-left: 3px solid #729b8c;
  background: var(--soft);
}

.callout p {
  margin: 0.45rem 0 0;
  color: var(--muted);
  line-height: 1.55;
}

.connection-overview {
  grid-column: 1 / -1;
  grid-row: 2;
  width: 100%;
  margin: 0;
  padding: 1.55rem 3.5rem 2.75rem;
  border-top: 1px solid var(--line-strong);
  background: var(--white);
}

.manager:not([data-page="setup"]) > .connection-overview {
  display: none;
}

.connection-overview h2 {
  margin-bottom: 0.75rem;
  font-size: 1rem;
  font-weight: 700;
}

.connection-row {
  min-height: 52px;
  display: grid;
  grid-template-columns: 12px minmax(130px, 1fr) minmax(130px, 1fr) 16px;
  gap: 0.7rem;
  align-items: center;
  border-top: 1px solid var(--line);
  padding: 0.6rem 0.2rem;
}

.connection-row:last-child {
  border-bottom: 1px solid var(--line);
}

.connection-row > span:nth-last-child(2) {
  color: var(--muted);
}

.connection-row > svg {
  width: 18px;
  height: 18px;
  color: var(--ink);
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.overview-status.is-ready {
  color: var(--green-dark);
}

.overview-status.is-attention {
  color: var(--warning);
}

.overview-status.is-info {
  color: var(--info);
}

.connection-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #98a2ad;
}

.connection-dot.is-ready {
  background: var(--green-bright);
}

.connection-dot.is-attention {
  background: #e59b0c;
}

.connection-dot.is-info {
  background: var(--info);
}

.card-grid {
  display: grid;
  gap: 0;
  margin-bottom: 1.4rem;
  border-top: 1px solid var(--line);
}

.status-card {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 1.1rem 0;
  border-bottom: 1px solid var(--line);
}

.status-card h2,
.status-card p {
  margin: 0;
}

.status-card h2 {
  font-size: 1.1rem;
  font-weight: 800;
}

.status-card p {
  margin-top: 0.25rem;
  color: var(--muted);
  font-size: 0.84rem;
}

.card-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  color: white;
  font-weight: 900;
}

.card-icon.harvest {
  background: #f06b40;
}

.card-icon.jira {
  background: #2867c6;
}

.danger-link {
  min-height: 0;
  padding: 0.6rem 0;
  border: 0;
  color: var(--danger);
  background: transparent;
  text-decoration: underline;
}

.danger-link:hover {
  color: #6f201c;
  background: transparent;
}

.history-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
}

.history-heading .eyebrow {
  display: none;
}

.history-heading > div {
  min-width: 0;
}

.history-heading .lede {
  max-width: 710px;
}

.history-clear-button {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 40px;
  margin-top: 1.55rem;
  border-color: #caa8a5;
  padding: 0.55rem 0.8rem;
  color: var(--danger);
  background: var(--white);
  font-size: 0.88rem;
  font-weight: 700;
}

.history-clear-button:hover:not(:disabled) {
  border-color: var(--danger);
  color: #762521;
  background: #fff7f6;
}

.history-clear-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.history-clear-button svg,
.dialog-icon svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.history-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 1.55rem 0 0;
  border-block: 1px solid var(--line-strong);
  background: var(--soft);
}

.history-summary > div {
  min-width: 0;
  padding: 0.85rem 1rem;
  border-right: 1px solid var(--line);
}

.history-summary > div:last-child {
  border-right: 0;
}

.history-summary strong,
.history-summary span {
  display: block;
}

.history-summary strong {
  color: var(--ink-strong);
  font-size: 1.35rem;
  font-weight: 850;
  line-height: 1.1;
}

.history-summary span {
  margin-top: 0.22rem;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 650;
}

.history-summary.has-attention .history-summary-attention strong,
.history-summary.has-attention .history-summary-attention span {
  color: #8a6214;
}

.history-tools {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--line);
  padding: 0.55rem 0;
}

.history-filter {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  background: var(--white);
}

.history-filter button,
.history-expand-button,
.history-retry-button {
  min-height: 34px;
  border: 0;
  border-radius: 3px;
  padding: 0.42rem 0.7rem;
  color: var(--muted);
  background: transparent;
  font-size: 0.78rem;
  font-weight: 700;
}

.history-filter button + button {
  border-left: 1px solid var(--line-strong);
  border-radius: 0 3px 3px 0;
}

.history-filter button:first-child {
  border-radius: 3px 0 0 3px;
}

.history-filter button:hover,
.history-filter button.is-active,
.history-expand-button:hover:not(:disabled),
.history-retry-button:hover {
  color: var(--green-dark);
  background: var(--sage);
}

.history-filter button.is-active {
  box-shadow: inset 0 -2px var(--green-bright);
}

.history-tool-actions {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.history-tool-actions > span {
  color: var(--muted);
  font-size: 0.75rem;
}

.history-expand-button {
  border: 1px solid var(--line-strong);
  color: var(--green-dark);
  background: var(--white);
}

.history-expand-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.history-list {
  display: grid;
  gap: 0;
}

.history-day {
  border-bottom: 1px solid var(--line);
}

.history-day summary {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto 22px;
  gap: 1.4rem;
  align-items: center;
  min-height: 84px;
  padding: 0.95rem 0.35rem;
  cursor: pointer;
  list-style: none;
}

.history-day summary::-webkit-details-marker {
  display: none;
}

.history-day summary:hover {
  background: var(--soft);
}

.history-day summary:focus-visible {
  position: relative;
  z-index: 1;
  outline: 3px solid rgb(42 105 184 / 0.25);
  outline-offset: -3px;
}

.history-day[open] > summary {
  border-left: 3px solid var(--green-bright);
  padding-left: calc(0.35rem - 3px);
  background: linear-gradient(90deg, var(--sage), var(--white) 36%);
}

.history-day-title > strong,
.history-day-title > small {
  display: block;
}

.history-day-title > strong {
  color: var(--ink);
  font-size: 1.04rem;
  font-weight: 750;
}

.history-day-title > small {
  margin-top: 0.25rem;
  color: var(--muted);
  font-size: 0.8rem;
}

.history-day-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(64px, auto));
  gap: 1.4rem;
  text-align: right;
}

.history-day-metrics strong,
.history-day-metrics small {
  display: block;
}

.history-day-metrics .has-attention strong,
.history-day-metrics .has-attention small {
  color: #8a6214;
}

.history-day-metrics strong {
  color: var(--ink);
  font-size: 0.94rem;
  font-weight: 700;
}

.history-day-metrics small {
  margin-top: 0.15rem;
  color: var(--muted);
  font-size: 0.74rem;
}

.history-chevron {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: var(--green-dark);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
  transition: transform 160ms ease;
}

.history-day[open] .history-chevron {
  transform: rotate(90deg);
}

.history-day-body {
  padding: 0 0.35rem 1rem;
}

.history-day-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  padding: 0.7rem 0 0.75rem 9.45rem;
  border-top: 1px solid var(--line);
}

.history-day-overview > div {
  min-width: 0;
  padding: 0 0.7rem;
  border-left: 1px solid var(--line);
}

.history-day-overview > div:first-child {
  border-left: 0;
  padding-left: 0;
}

.history-day-overview dt,
.history-entry-details dt {
  color: var(--muted);
  font-size: 0.65rem;
  font-weight: 750;
  letter-spacing: 0.045em;
  text-transform: uppercase;
}

.history-day-overview dd,
.history-entry-details dd {
  margin: 0.18rem 0 0;
  color: var(--ink);
  font-size: 0.76rem;
  font-weight: 650;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.history-entries {
  display: grid;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--line);
}

.history-entry {
  position: relative;
  display: grid;
  grid-template-columns: 8.4rem minmax(0, 1fr) 7.8rem;
  gap: 1.05rem;
  padding: 0.85rem 0.45rem 0.85rem 0;
  border-bottom: 1px solid var(--line);
}

.history-entry.is-incomplete,
.history-entry.is-overlap {
  border-left: 3px solid #d99512;
  padding-left: 0.45rem;
  background: linear-gradient(90deg, #fff9ed, var(--white) 44%);
}

.history-entry.is-manual:not(.is-incomplete):not(.is-overlap),
.history-entry.is-mock:not(.is-incomplete):not(.is-overlap) {
  border-left: 3px solid #87a2c3;
  padding-left: 0.45rem;
  background: linear-gradient(90deg, #f6f9fc, var(--white) 38%);
}

.history-entry-time {
  padding-right: 0.75rem;
  text-align: right;
}

.history-entry-time strong,
.history-entry-time small {
  display: block;
}

.history-entry-time strong {
  color: var(--ink);
  font-size: 0.86rem;
  font-weight: 700;
  white-space: nowrap;
}

.history-entry-time small {
  margin-top: 0.2rem;
  color: var(--muted);
  font-size: 0.76rem;
}

.history-entry-content {
  min-width: 0;
  padding-left: 0.4rem;
}

.history-entry-content > h3,
.history-entry-content > small {
  display: block;
}

.history-entry-content > h3 {
  margin-top: 0.25rem;
  margin-bottom: 0;
  color: var(--ink);
  font-size: 0.96rem;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.history-entry-content > small {
  margin-top: 0.28rem;
  color: var(--muted);
  font-size: 0.8rem;
  overflow-wrap: anywhere;
}

.history-entry-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.8rem;
  align-items: center;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.045em;
  text-transform: uppercase;
}

.history-ticket-key {
  color: var(--green-dark);
  overflow-wrap: anywhere;
}

.history-entry-details {
  margin: 0.38rem 0 0;
}

.history-entry-details > div {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.45rem;
  align-items: baseline;
}

.history-entry-details dd {
  margin-top: 0;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 500;
}

.history-entry-status {
  display: grid;
  align-content: start;
  justify-items: end;
  gap: 0.42rem;
  padding-top: 0.1rem;
  text-align: right;
}

.history-entry-source {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--green-dark);
  font-size: 0.7rem;
  font-weight: 750;
  letter-spacing: 0.025em;
}

.history-entry-source::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green-bright);
}

.history-entry-source.is-manual {
  color: var(--info);
}

.history-entry-source.is-manual::before {
  background: var(--info);
}

.history-entry-source.is-mock {
  color: var(--info);
}

.history-entry-source.is-mock::before {
  background: var(--info);
}

.history-entry-warning {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #8a6214;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.3;
}

.history-entry-warning::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning);
}

.history-no-entries {
  margin: 0;
  padding: 1.2rem 0;
  color: var(--muted);
  font-size: 0.82rem;
  text-align: center;
}

.history-empty {
  display: grid;
  justify-items: center;
  padding: 3.5rem 1.5rem;
  color: var(--muted);
  text-align: center;
  border-bottom: 1px solid var(--line);
}

.history-empty svg {
  width: 38px;
  height: 38px;
  margin-bottom: 0.9rem;
  fill: none;
  stroke: var(--green);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.35;
}

.history-empty strong {
  color: var(--ink);
  font-size: 0.95rem;
}

.history-empty p {
  max-width: 380px;
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  line-height: 1.55;
}

.history-empty .history-retry-button {
  margin-top: 0.85rem;
  border: 1px solid var(--line-strong);
  color: var(--green-dark);
  background: var(--white);
}

.history-state {
  min-height: 190px;
  display: grid;
  place-items: center;
  align-content: center;
  padding: 2rem;
  color: var(--muted);
  text-align: center;
  border-bottom: 1px solid var(--line);
}

.history-state > svg,
.history-state > .history-spinner {
  width: 34px;
  height: 34px;
  margin-bottom: 0.8rem;
}

.history-state > svg {
  fill: none;
  stroke: var(--danger);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

.history-state strong {
  color: var(--ink);
  font-size: 0.95rem;
}

.history-state p {
  max-width: 390px;
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  line-height: 1.5;
}

.history-state .history-retry-button {
  margin-top: 0.9rem;
  border: 1px solid var(--line-strong);
  color: var(--green-dark);
  background: var(--white);
}

.history-spinner {
  display: block;
  border: 2px solid var(--line);
  border-top-color: var(--green-bright);
  border-radius: 50%;
  animation: history-spin 800ms linear infinite;
}

@keyframes history-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .developer-link {
    transition: none;
  }

  .developer-link:hover,
  .developer-link:active {
    transform: none;
  }

  .history-spinner {
    animation: none;
    border-top-color: var(--green-bright);
  }
}

.history-legend {
  display: grid;
  gap: 1.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.history-legend li {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  gap: 0.7rem;
  align-items: start;
}

.history-legend-mark {
  width: 9px;
  height: 9px;
  margin-top: 0.35rem;
  border-radius: 50%;
  background: #98a2ad;
}

.history-legend-mark.is-harvest {
  background: var(--green-bright);
}

.history-legend-mark.is-local {
  background: var(--info);
}

.history-legend-mark.is-attention {
  background: var(--warning);
}

.history-legend strong,
.history-legend small {
  display: block;
}

.history-legend strong {
  color: var(--ink);
  font-size: 0.92rem;
}

.history-legend small {
  margin-top: 0.2rem;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.confirmation-dialog {
  width: min(460px, calc(100vw - 2rem));
  margin: auto;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  padding: 1.6rem;
  color: var(--ink);
  background: var(--white);
  box-shadow: 0 24px 70px rgb(16 39 31 / 0.22);
}

.confirmation-dialog::backdrop {
  background: rgb(10 28 22 / 0.48);
  backdrop-filter: blur(2px);
}

.dialog-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-bottom: 1rem;
  border-radius: 50%;
  color: var(--danger);
  background: #fff0ef;
}

.confirmation-dialog h2 {
  margin: 0;
  color: var(--ink);
  font-size: 1.25rem;
  font-weight: 830;
  letter-spacing: -0.02em;
}

.confirmation-dialog p {
  margin: 0.65rem 0 0;
  color: var(--muted);
  font-size: 0.86rem;
  line-height: 1.6;
}

.confirmation-dialog .dialog-error {
  margin-top: 0.9rem;
  border-left: 3px solid var(--danger);
  padding: 0.6rem 0.75rem;
  color: #762521;
  background: #fff0ef;
  font-weight: 650;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 1.4rem;
}

.secondary-button {
  border-color: var(--line-strong);
  color: var(--ink);
  background: var(--white);
}

.secondary-button:hover {
  color: var(--green-dark);
  background: var(--soft);
}

.danger-button {
  border-color: var(--danger);
  background: var(--danger);
}

.danger-button:hover {
  border-color: #762521;
  background: #762521;
}

.empty {
  padding: 2rem;
  color: var(--muted);
  text-align: center;
  border: 1px dashed #bdc9c4;
}

.health-list {
  margin: 0 0 1.3rem;
  border-top: 1px solid var(--line);
}

.health-list div {
  display: grid;
  grid-template-columns: 170px 1fr;
  gap: 1rem;
  padding: 0.9rem 0.2rem;
  border-bottom: 1px solid var(--line);
}

.health-list dt {
  color: var(--muted);
}

.health-list dd {
  margin: 0;
  font-weight: 750;
}

.health-list .health-path {
  color: var(--ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.86rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.health-restart {
  border: 1px solid var(--line);
  border-left: 3px solid var(--green-bright);
  padding: 1.2rem;
  background: linear-gradient(105deg, #f1f7f2 0%, var(--white) 76%);
}

.health-restart-heading {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 0.8rem;
  align-items: start;
}

.health-restart-heading strong {
  display: block;
  padding-top: 0.15rem;
  color: var(--ink);
  font-size: 1rem;
}

.health-restart-heading p {
  max-width: 680px;
}

.health-restart-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--green-dark);
  background: #e1efe5;
}

.health-restart-icon svg,
.restart-button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.restart-actions {
  display: flex;
  gap: 0.8rem 1rem;
  align-items: center;
  margin: 1rem 0 0 2.8rem;
}

.restart-button {
  flex: 0 0 auto;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0.55rem 0.85rem;
  font-size: 0.88rem;
}

.restart-button:disabled {
  border-color: #aab9b1;
  color: #687870;
  background: #e7ece9;
  cursor: not-allowed;
}

#restart-availability {
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.45;
}

.restart-fallback {
  margin: 1rem 0 0 2.8rem;
  border-top: 1px solid var(--line);
  padding-top: 0.75rem;
  color: var(--muted);
  font-size: 0.8rem;
}

.restart-fallback.is-unavailable {
  border-top-color: #d6b779;
}

.restart-fallback summary {
  width: fit-content;
  color: var(--green-dark);
  font-weight: 720;
  cursor: pointer;
}

.restart-fallback p {
  margin: 0.65rem 0 0.55rem;
  font-size: inherit;
}

.restart-fallback code {
  display: block;
  width: 100%;
  padding: 0.55rem 0.65rem;
}

.restart-command + .restart-command {
  margin-top: 0.75rem;
}

.restart-command strong {
  display: block;
  margin-bottom: 0.3rem;
  color: var(--ink);
  font-size: 0.76rem;
}

.health-restart .restart-status {
  margin: 1rem 0 0 2.8rem;
  border-left: 3px solid var(--info);
  padding: 0.65rem 0.75rem;
  color: #1e4e87;
  background: #edf5ff;
  font-size: 0.84rem;
  font-weight: 650;
}

.health-restart .restart-status.is-success {
  border-left-color: var(--green-bright);
  color: var(--green-dark);
  background: #eaf5ed;
}

.health-restart .restart-status.is-error {
  border-left-color: var(--danger);
  color: #762521;
  background: #fff0ef;
}

.restart-dialog .dialog-icon {
  color: var(--green-dark);
  background: #e1efe5;
}

.confirmation-dialog .dialog-note {
  color: var(--ink);
}

.help-rail h2 {
  margin: 0 0 1.5rem;
  color: var(--ink-strong);
  font-size: 1.28rem;
  font-weight: 700;
}

.help-rail h3 {
  font-size: 1.05rem;
}

.help-rail p {
  color: var(--muted);
  font-size: 1rem;
  line-height: 1.55;
}

.help-rail a {
  font-size: 0.94rem;
  font-weight: 650;
}

.help-data-directory {
  display: block;
  margin-top: 0.45rem;
  padding: 0.45rem 0.55rem;
  font-size: 0.72rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.help-rail [data-help-page="default"] > a {
  display: none;
}

.help-rail hr {
  margin: 2.5rem 0 2rem;
  border: 0;
  border-top: 1px solid var(--line-strong);
}

.security-title {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  color: var(--ink-strong);
}

.security-title svg {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  padding: 12px;
  border-radius: 50%;
  color: var(--green-dark);
  background: var(--sage);
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.check-list {
  counter-reset: needs;
  display: grid;
  gap: 1.55rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mobile-needs {
  display: none;
}

.check-list li {
  counter-increment: needs;
  position: relative;
  min-height: 30px;
  padding: 0.2rem 0 0 2.65rem;
  color: var(--ink);
  font-size: 1.05rem;
  line-height: 1.5;
  max-width: 290px;
}

.check-list li::before {
  content: counter(needs);
  position: absolute;
  left: 0;
  top: 0;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--green);
  border-radius: 50%;
  color: var(--green-dark);
  font-size: 0.78rem;
  font-weight: 700;
}

.resource-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.resource-links > a {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20px;
  gap: 0.75rem;
  align-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  padding: 0.85rem;
  color: var(--ink);
  background: var(--white);
  text-decoration: none;
}

.resource-links > a:hover {
  border-color: #83aa98;
  background: #f5faf6;
}

.resource-links strong,
.resource-links small {
  display: block;
}

.resource-links strong {
  font-size: 0.78rem;
  line-height: 1.35;
}

.resource-links small {
  margin-top: 0.25rem;
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 520;
  line-height: 1.4;
}

.resource-links svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--green-dark);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.instruction-list,
.review-flow {
  display: grid;
  gap: 0;
  margin: 1.2rem 0;
  padding: 0;
  list-style: none;
}

.instruction-list li,
.review-flow li {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 0.85rem;
  padding: 0.85rem 0;
  border-top: 1px solid var(--line);
}

.instruction-list li:last-child,
.review-flow li:last-child {
  border-bottom: 1px solid var(--line);
}

.instruction-list li > span,
.review-flow li > span {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid #8eb5a3;
  border-radius: 50%;
  color: var(--green-dark);
  background: #eff7f1;
  font-size: 0.75rem;
  font-weight: 800;
}

.instruction-list strong,
.review-flow strong {
  color: var(--ink);
  font-size: 0.86rem;
}

.instruction-list p,
.review-flow p {
  margin: 0.25rem 0 0;
  color: var(--muted);
  line-height: 1.5;
}

.config-example {
  margin: 1rem 0;
  border: 1px solid #d8e2de;
  border-radius: 5px;
  padding: 0.85rem 1rem;
  background: #f4f7f5;
  overflow-x: auto;
}

.config-example code {
  color: #29463b;
  font-size: 0.7rem;
  line-height: 1.65;
  white-space: nowrap;
}

.inline-actions,
.review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-top: 1rem;
}

.secondary-action,
.primary-external-action {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  padding: 0.65rem 0.9rem;
  font-size: 0.76rem;
  font-weight: 750;
  text-decoration: none;
}

.secondary-action {
  border: 1px solid var(--green);
  color: var(--green-dark);
  background: var(--white);
}

.secondary-action:hover {
  background: var(--sage);
}

.primary-external-action {
  border: 1px solid var(--green-dark);
  color: white;
  background: var(--green-dark);
}

.primary-external-action:hover {
  color: white;
  background: #173f31;
}

.text-action {
  color: var(--green-dark);
  font-size: 0.74rem;
  font-weight: 700;
  text-underline-offset: 3px;
}

.review-ready-banner {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 0.8rem;
  margin: 1.25rem 0 0.75rem;
  border: 1px solid #a9c9b5;
  border-left: 4px solid var(--green);
  border-radius: 5px;
  padding: 1rem;
  background: #eff7f1;
}

.review-ready-banner > span {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: white;
  background: var(--green);
  font-weight: 850;
}

.review-ready-banner strong {
  color: var(--green-dark);
}

.review-ready-banner p {
  margin: 0.25rem 0 0;
  color: #405a50;
  line-height: 1.5;
}

.review-ready-banner.is-pending {
  border-color: #dec694;
  border-left-color: #b9821e;
  background: #fff9ec;
}

.review-ready-banner.is-pending > span {
  background: #b9821e;
}

.review-privacy-note,
.detection-boundary {
  margin-top: 1.35rem;
  border-left: 3px solid var(--green);
  padding: 0.75rem 0.9rem;
  color: #405a50;
  background: #f4f8f5;
  line-height: 1.55;
}

.detection-explainer,
.companion-explainer {
  margin: 1.4rem 0 0;
  border-top: 1px solid var(--line-strong);
  padding: 1.35rem 0 1.6rem;
}

.detection-explainer h2,
.companion-explainer h2 {
  margin: 0;
  color: var(--ink);
  font-size: 1.25rem;
}

.detection-explainer > p,
.companion-explainer > p,
.companion-explainer li {
  color: var(--muted);
  line-height: 1.6;
}

.detection-explainer dl {
  margin: 1rem 0 0;
  border-block: 1px solid var(--line);
}

.detection-explainer dl > div {
  display: grid;
  grid-template-columns: 135px minmax(0, 1fr);
  gap: 0.9rem;
  padding: 0.65rem 0;
}

.detection-explainer dl > div + div {
  border-top: 1px solid var(--line);
}

.detection-explainer dt {
  color: var(--ink);
  font-size: 0.74rem;
  font-weight: 750;
}

.detection-explainer dd {
  margin: 0;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.5;
}

.companion-explainer ul {
  display: grid;
  gap: 0.5rem;
  margin: 0.9rem 0 0;
  padding-left: 1.2rem;
}

.muted {
  color: var(--muted);
}

@media (max-width: 1240px) {
  .site-header {
    grid-template-columns: auto 1fr auto;
    gap: 0.9rem;
    padding-inline: 1.5rem;
  }

  .brand {
    gap: 0.45rem;
    font-size: 1.45rem;
  }

  .brand-mark {
    width: 34px;
    height: 34px;
  }

  .main-nav {
    gap: clamp(0.65rem, 1.25vw, 1.15rem);
    padding-left: 0;
  }

  .main-nav a,
  .header-links a {
    font-size: 0.9rem;
  }

  .header-links {
    gap: 1rem;
  }

  .store-mark,
  .github-mark {
    width: 19px;
    height: 19px;
  }

  .external-mark {
    width: 13px;
    height: 13px;
  }

  .manager {
    width: min(1000px, 100%);
    grid-template-columns: 220px minmax(0, 780px);
  }

  .help-rail {
    display: none;
  }
}

@media (max-width: 1050px) {
  .site-header {
    grid-template-columns: 200px minmax(0, 1fr);
  }

  .header-links {
    display: none;
  }
}

@media (min-width: 901px) {
  .developer-link {
    min-width: 285px;
  }

  .setup-form-area {
    max-width: 747px;
  }
}

@media (max-width: 900px) {
  .site-header {
    min-height: 85px;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    padding: 0 clamp(1.25rem, 4.45vw, 2.4rem);
  }

  .brand {
    gap: 0.75rem;
    color: #0d5632;
    font-size: clamp(1.55rem, 3.9vw, 2.08rem);
  }

  .brand-mark {
    width: clamp(38px, 6vw, 52px);
    height: clamp(38px, 6vw, 52px);
  }

  .menu-toggle {
    justify-self: end;
    display: grid;
    gap: 6px;
    width: 48px;
    min-height: 48px;
    padding: 9px;
    border: 0;
    background: transparent;
  }

  .menu-toggle:hover {
    background: var(--soft);
  }

  .menu-toggle > span:not(.sr-only) {
    display: block;
    width: 29px;
    height: 3px;
    border-radius: 2px;
    background: var(--green-dark);
  }

  .main-nav {
    position: absolute;
    top: 85px;
    left: 0;
    right: 0;
    display: none;
    grid-template-columns: 1fr;
    gap: 0;
    padding: 0.35rem clamp(1.25rem, 4.45vw, 2.4rem) 0.8rem;
    border-bottom: 1px solid var(--line);
    background: var(--white);
    box-shadow: 0 14px 24px rgb(16 39 31 / 0.08);
  }

  .is-menu-open .main-nav {
    display: grid;
  }

  .main-nav a {
    min-height: 44px;
    border: 0;
    border-bottom: 1px solid var(--line);
    padding: 0.6rem 0;
  }

  .main-nav a.is-active {
    color: var(--green-dark);
  }

  .manager {
    display: block;
    width: 100%;
    min-height: calc(100vh - 85px);
    border: 0;
  }

  .step-rail {
    display: none;
  }

  .content {
    width: 100%;
    padding: 2.4rem clamp(1.25rem, 4.45vw, 2.4rem) 3.75rem;
  }

  .manager[data-page="setup"] .content {
    padding-bottom: 0;
  }

  .resource-links {
    margin-top: 1.5rem;
  }

  .review-flow,
  .instruction-list {
    margin-block: 1.4rem;
  }

  .setup-intro h1,
  .page > h1,
  .history-heading h1 {
    font-size: clamp(2.2rem, 4.8vw, 2.6rem);
    line-height: 1.12;
  }

  .lede {
    margin-bottom: 0;
    font-size: clamp(1rem, 2.4vw, 1.28rem);
    line-height: 1.58;
  }

  .page > .lede {
    margin-bottom: 1.5rem;
  }

  .mobile-progress {
    display: block;
    margin: 2.75rem 0 2.15rem;
  }

  .mobile-progress ol {
    position: relative;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .mobile-progress ol::before {
    content: "";
    position: absolute;
    top: 24px;
    left: 10%;
    right: 10%;
    height: 1px;
    background: var(--line-strong);
  }

  .mobile-progress ol::after {
    content: "";
    position: absolute;
    top: 24px;
    left: 10%;
    width: 20%;
    height: 2px;
    background: var(--green);
  }

  .mobile-progress li {
    position: relative;
    z-index: 1;
    min-width: 0;
    display: grid;
    justify-items: center;
    gap: 0.35rem;
    text-align: center;
  }

  .mobile-progress li > span {
    width: 49px;
    height: 49px;
  }

  .mobile-progress strong {
    max-width: 112px;
    color: var(--ink);
    font-size: clamp(0.72rem, 2.1vw, 1.12rem);
    font-weight: 500;
    line-height: 1.2;
  }

  .mobile-progress li.is-current strong {
    color: var(--green-dark);
  }

  .setup-intro {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: 0;
  }

  .setup-intro h1 {
    margin-bottom: 0.65rem;
  }

  .setup-intro .lede {
    max-width: 540px;
  }

  .setup-section-heading h2 {
    font-size: clamp(1.75rem, 3.8vw, 2.05rem);
  }

  .setup-copy {
    margin-top: 0.9rem;
    font-size: clamp(1rem, 2.4vw, 1.28rem);
    line-height: 1.6;
  }

  .desktop-setup-copy {
    display: none;
  }

  .mobile-setup-copy {
    display: inline;
  }

  .developer-link {
    width: 100%;
    min-height: 68px;
    margin-top: 1.9rem;
    border-radius: 6px;
    font-size: clamp(1rem, 2.35vw, 1.24rem);
  }

  .setup-form-area {
    margin-top: 2rem;
  }

  .setup-form-area .form-stack {
    gap: 0.7rem;
    margin-top: 2rem;
  }

  .setup-form-area .form-stack:first-child {
    margin-top: 0;
  }

  .setup-form-area .form-stack label {
    font-size: clamp(1rem, 2.3vw, 1.2rem);
  }

  .secure-input input,
  .select-wrap select {
    min-height: 68px;
    border-color: var(--green);
    border-radius: 6px;
    padding-inline: 1.2rem 4rem;
    font-size: clamp(1rem, 2.35vw, 1.22rem);
  }

  .visibility-toggle {
    right: 0.8rem;
    width: 46px;
    min-height: 46px;
  }

  .secure-input svg,
  .select-wrap svg {
    width: 25px;
    height: 25px;
  }

  .setup-primary-action {
    width: 100%;
    min-height: 67px;
    margin-top: 2rem;
    border-radius: 6px;
    justify-content: center;
    font-size: clamp(1rem, 2.35vw, 1.22rem);
  }

  .setup-primary-action svg {
    display: none;
  }

  .advanced-oauth {
    margin-top: 2rem;
    border-block: 1px solid var(--line);
  }

  .advanced-oauth summary {
    min-height: 68px;
    justify-content: space-between;
    font-size: clamp(1rem, 2.25vw, 1.18rem);
  }

  .advanced-oauth summary svg {
    order: 0;
  }

  .advanced-oauth p {
    margin-left: 0;
    font-size: 1rem;
  }

  .harvest-setup > .developer-link,
  .harvest-setup > .setup-form-area,
  .harvest-setup > .connected-summary,
  .harvest-setup > .advanced-oauth {
    margin-top: 1.5rem;
  }

  .panel {
    padding-block: 1.45rem 2rem;
  }

  .panel-heading {
    display: grid;
  }

  .panel-heading .status-badge {
    justify-self: start;
  }

  .instruction {
    grid-template-columns: 28px minmax(0, 1fr);
    padding: 0.85rem;
  }

  .input-action {
    grid-template-columns: 1fr;
  }

  .input-action button {
    width: 100%;
  }

  .form-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .connection-row {
    grid-template-columns: minmax(110px, 1fr) 10px minmax(100px, auto) 18px;
    gap: 0.5rem;
    min-height: 60px;
    font-size: clamp(0.9rem, 2.1vw, 1.08rem);
  }

  .connection-row > span:nth-last-child(2) {
    text-align: right;
  }

  .connection-row > .connection-dot {
    grid-column: 2;
    grid-row: 1;
  }

  .connection-row > strong {
    grid-column: 1;
    grid-row: 1;
  }

  .connection-row > .overview-status,
  .connection-row > span:nth-child(3) {
    grid-column: 3;
    grid-row: 1;
  }

  .connection-row > svg {
    grid-column: 4;
    grid-row: 1;
  }

  .status-card {
    grid-template-columns: 40px 1fr;
  }

  .status-card .status-badge {
    grid-column: 2;
    justify-self: start;
  }

  .history-heading {
    display: grid;
    gap: 1rem;
  }

  .history-clear-button {
    justify-self: start;
    margin-top: 0;
  }

  .history-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 1.5rem;
  }

  .history-summary > div {
    padding: 0.85rem 0.9rem;
  }

  .history-summary > div:nth-child(2) {
    border-right: 0;
  }

  .history-summary > div:nth-child(-n + 2) {
    border-bottom: 1px solid var(--line);
  }

  .history-tools {
    display: grid;
    gap: 0.65rem;
    padding-block: 0.7rem;
  }

  .history-tool-actions {
    justify-content: space-between;
    width: 100%;
  }

  .history-tool-actions > span {
    line-height: 1.35;
  }

  .history-day summary {
    grid-template-columns: minmax(0, 1fr) 20px;
    gap: 0.75rem;
    padding-block: 1rem;
  }

  .history-day-metrics {
    grid-column: 1 / -1;
    grid-row: 2;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.65rem;
    text-align: left;
  }

  .history-chevron {
    grid-column: 2;
    grid-row: 1;
  }

  .history-day-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0.75rem 0;
    line-height: 1.5;
  }

  .history-day-overview > div {
    padding: 0.15rem 0.7rem 0.6rem;
  }

  .history-day-overview > div:nth-child(odd) {
    border-left: 0;
    padding-left: 0;
  }

  .history-day-overview > div:nth-child(-n + 2) {
    padding-top: 0;
  }

  .history-day-overview > div:nth-child(n + 3) {
    border-top: 1px solid var(--line);
    padding-top: 0.7rem;
    padding-bottom: 0;
  }

  .history-entry {
    grid-template-columns: 1fr;
    gap: 0.55rem;
    padding: 0.85rem 0.15rem;
  }

  .history-entry.is-incomplete,
  .history-entry.is-overlap,
  .history-entry.is-manual:not(.is-incomplete):not(.is-overlap),
  .history-entry.is-mock:not(.is-incomplete):not(.is-overlap) {
    padding-inline: 0.65rem 0.25rem;
  }

  .history-entry-time {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
    padding-right: 0;
    text-align: left;
  }

  .history-entry-time strong,
  .history-entry-time small {
    display: inline;
    margin: 0;
  }

  .history-entry-content {
    padding-left: 0;
  }

  .history-entry-status {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 0.45rem 0.85rem;
    padding-top: 0.1rem;
    text-align: left;
  }

  .confirmation-dialog {
    padding: 1.3rem;
  }

  .dialog-actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }

  .dialog-actions button {
    width: 100%;
  }

  .health-list div {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }

  .health-restart {
    padding: 1rem;
  }

  .health-restart-heading {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 0.65rem;
  }

  .health-restart-icon {
    width: 32px;
    height: 32px;
  }

  .restart-actions {
    align-items: stretch;
    flex-direction: column;
    margin-left: 0;
  }

  .restart-button {
    width: 100%;
  }

  .restart-fallback,
  .health-restart .restart-status {
    margin-left: 0;
  }

  .help-rail {
    display: block;
    padding: 1.65rem clamp(1.25rem, 4.45vw, 2.4rem) 1.5rem;
    border: 0;
    border-top: 1px solid var(--line);
  }

  .manager:not([data-page="setup"]) .help-rail {
    display: none;
  }

  .help-rail h2 {
    margin-top: 0;
    margin-bottom: 0.65rem;
    font-size: clamp(1.2rem, 2.8vw, 1.45rem);
  }

  .help-rail p,
  .help-rail a,
  .check-list li {
    font-size: clamp(0.96rem, 2.35vw, 1.22rem);
  }

  .help-rail [data-help-page="default"] > a {
    display: inline-flex;
  }

  .desktop-needs {
    display: none;
  }

  .mobile-needs {
    display: grid;
    gap: 0.55rem;
    margin: 0;
    padding-left: 2rem;
    color: var(--ink);
    font-size: clamp(0.96rem, 2.35vw, 1.22rem);
    line-height: 1.5;
  }

  .mobile-needs li::marker {
    color: var(--green-dark);
    font-weight: 700;
  }

  .help-rail hr {
    margin: 1.25rem 0 0;
  }

  .security-title {
    margin: 0 0 0.5rem;
  }

  .security-title + p {
    margin-top: 0.45rem;
    margin-bottom: 0;
  }

  .security-title svg {
    width: 32px;
    height: 32px;
    padding: 3px;
    background: transparent;
  }

  .connection-overview {
    padding: 1rem clamp(1.25rem, 4.45vw, 2.4rem) 2.8rem;
  }

  .connection-overview h2 {
    font-size: clamp(1.2rem, 2.8vw, 1.45rem);
  }
}

@media (max-width: 520px) {
  .site-header {
    min-height: 72px;
    padding-inline: 1.25rem;
  }

  .brand {
    gap: 0.55rem;
    font-size: 1.55rem;
  }

  .brand-mark {
    width: 38px;
    height: 38px;
  }

  .main-nav {
    top: 72px;
    padding-inline: 1.25rem;
  }

  .manager {
    min-height: calc(100vh - 72px);
  }

  .content {
    padding: 2rem 1.25rem 3.5rem;
  }

  .manager[data-page="setup"] .content {
    padding-bottom: 0;
  }

  .setup-intro h1,
  .page > h1,
  .history-heading h1 {
    font-size: 2.15rem;
  }

  .setup-intro .lede,
  .lede,
  .setup-copy {
    font-size: 1rem;
  }

  .history-filter,
  .history-filter button {
    min-width: 0;
  }

  .history-filter {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .history-filter button {
    padding-inline: 0.45rem;
  }

  .history-tool-actions {
    display: grid;
    gap: 0.5rem;
  }

  .history-expand-button {
    justify-self: start;
  }

  .history-day-title > strong {
    font-size: 0.96rem;
  }

  .history-day-title > small {
    font-size: 0.74rem;
    line-height: 1.4;
  }

  .history-day-metrics {
    gap: 0.45rem;
  }

  .history-day-metrics strong {
    font-size: 0.87rem;
  }

  .history-day-metrics small {
    font-size: 0.68rem;
  }

  .history-day-overview {
    grid-template-columns: 1fr;
  }

  .history-day-overview > div,
  .history-day-overview > div:nth-child(odd),
  .history-day-overview > div:nth-child(-n + 2),
  .history-day-overview > div:nth-child(n + 3) {
    border-top: 1px solid var(--line);
    border-left: 0;
    padding: 0.6rem 0;
  }

  .history-day-overview > div:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .mobile-progress {
    margin: 2.2rem -0.35rem 2.8rem;
  }

  .mobile-progress li > span {
    width: 43px;
    height: 43px;
  }

  .mobile-progress ol::before,
  .mobile-progress ol::after {
    top: 21px;
  }

  .mobile-progress strong {
    max-width: 70px;
    font-size: 0.68rem;
  }

  .resource-links {
    grid-template-columns: 1fr;
  }

  .inline-actions,
  .review-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .secondary-action,
  .primary-external-action {
    width: 100%;
  }

  .text-action {
    padding-block: 0.45rem;
  }

  .detection-explainer dl > div {
    grid-template-columns: 1fr;
    gap: 0.2rem;
  }

  .developer-link,
  .secure-input input,
  .select-wrap select,
  .setup-primary-action,
  .advanced-oauth summary {
    min-height: 54px;
  }

  .help-rail,
  .connection-overview {
    padding-inline: 1.25rem;
  }
}

.manager .page p,
.manager .help-rail p,
.manager .local-note p {
  font-size: 0.75rem;
}
`;
