const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const repoRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(repoRoot, "manifest.json");
const stylesheetPath = path.join(repoRoot, "feed-block.css");
const iconDir = path.join(repoRoot, "assets", "icons");
const contentScript = require(path.join(repoRoot, "content.js"));
const TEST_EXTENSION_ID = "test-extension-id";

function createMockChrome(overrides = {}) {
  const { runtime: runtimeOverrides = {}, ...chromeOverrides } = overrides;

  return {
    runtime: {
      id: TEST_EXTENSION_ID,
      getURL(assetPath) {
        return `chrome-extension://${TEST_EXTENSION_ID}/${assetPath}`;
      },
      ...runtimeOverrides
    },
    ...chromeOverrides
  };
}

async function withMockChrome(mockChrome, callback) {
  const originalChrome = global.chrome;
  global.chrome = mockChrome;

  try {
    return await callback();
  } finally {
    global.chrome = originalChrome;
  }
}

function createDom(stylesheet) {
  return new JSDOM(
    `<!doctype html>
    <html>
      <head><style>${stylesheet}</style></head>
      <body>
        <header class="global-nav">
          <nav>
            <ul>
              <li id="jobs-nav"><a href="https://www.linkedin.com/jobs/">Jobs</a></li>
              <li id="notifications-nav"><a href="https://www.linkedin.com/notifications/?filter=all">Notifications</a></li>
            </ul>
          </nav>
        </header>
        <div role="main">
          <div>
            <main>
              <div id="layout" style="display:grid;grid-template-columns:280px minmax(0,1fr) 320px;gap:24px;">
                <div id="left-column">left rail</div>
                <div id="feed-column">
                  <div componentkey="container-update-list_mainFeed-lazy-container">feed</div>
                </div>
                <div id="news-column">
                  <section>
                    <p>Linkedin News</p>
                  </section>
                </div>
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>`,
    {
      pretendToBeVisual: true,
      url: "https://www.linkedin.com/"
    }
  );
}

function createMessagingDom(stylesheet) {
  return new JSDOM(
    `<!doctype html>
    <html>
      <head><style>${stylesheet}</style></head>
      <body>
        <header class="global-nav">
          <nav>
            <ul>
              <li id="messaging-nav"><a href="https://www.linkedin.com/messaging/">Messaging</a></li>
              <li id="notifications-nav">
                <button aria-label="Notifications">
                  <span>Notifications</span>
                </button>
              </li>
            </ul>
          </nav>
        </header>
        <main>
          <section id="messages-pane">messages</section>
          <aside class="scaffold-layout__aside scaffold-layout__aside--ads" id="messaging-aside">
            <section class="ad-banner-container" id="ad-banner-container">
              <iframe data-ad-banner="" class="ad-banner" title="advertisement"></iframe>
            </section>
          </aside>
        </main>
      </body>
    </html>`,
    {
      pretendToBeVisual: true,
      url: "https://www.linkedin.com/messaging/thread/test"
    }
  );
}

function createWrappedNavDom(stylesheet) {
  return new JSDOM(
    `<!doctype html>
    <html>
      <head><style>${stylesheet}</style></head>
      <body>
        <header class="global-nav">
          <nav>
            <div class="global-nav__primary-item" id="jobs-item">
              <a href="https://www.linkedin.com/jobs/" aria-label="Jobs, 0 new notifications">Jobs</a>
            </div>
            <div class="global-nav__primary-item" id="notifications-item">
              <div class="global-nav__primary-link">
                <a href="#" data-view-name="nav.notifications">Notifications</a>
              </div>
            </div>
          </nav>
        </header>
      </body>
    </html>`,
    {
      pretendToBeVisual: true,
      url: "https://www.linkedin.com/messaging/thread/test"
    }
  );
}

function createLiveLinkedInNavDom(stylesheet) {
  return new JSDOM(
    `<!doctype html>
    <html>
      <head><style>${stylesheet}</style></head>
      <body>
        <nav aria-label="Primary Navigation">
          <ul class="global-nav__primary-items">
            <li class="global-nav__primary-item" id="jobs-item">
              <a class="global-nav__primary-link" href="https://www.linkedin.com/jobs/?" title="Jobs">
                <span class="global-nav__primary-link-text">Jobs</span>
              </a>
            </li>
            <li class="global-nav__primary-item" id="notifications-item">
              <a class="global-nav__primary-link" href="https://www.linkedin.com/notifications/?" title="Notifications">
                <div class="global-nav__primary-link-notif">
                  <span class="a11y-text">1 new notification</span>
                </div>
                <span class="global-nav__primary-link-text">Notifications</span>
              </a>
            </li>
          </ul>
        </nav>
      </body>
    </html>`,
    {
      pretendToBeVisual: true,
      url: "https://www.linkedin.com/messaging/thread/test"
    }
  );
}

function createNonTargetDom(stylesheet) {
  return new JSDOM(
    `<!doctype html>
    <html>
      <head><style>${stylesheet}</style></head>
      <body>
        <main>profile</main>
      </body>
    </html>`,
    {
      pretendToBeVisual: true,
      url: "https://www.linkedin.com/company/example/"
    }
  );
}

function createProfileDom(stylesheet) {
  return new JSDOM(
    `<!doctype html>
    <html>
      <head><style>${stylesheet}</style></head>
      <body>
        <header class="global-nav">
          <nav aria-label="Primary Navigation">
            <ul class="global-nav__primary-items">
              <li class="global-nav__primary-item" id="jobs-item">
                <a class="global-nav__primary-link" href="https://www.linkedin.com/jobs/?" title="Jobs">
                  <span class="global-nav__primary-link-text">Jobs</span>
                </a>
              </li>
              <li class="global-nav__primary-item" id="notifications-item">
                <a class="global-nav__primary-link" href="https://www.linkedin.com/notifications/?" title="Notifications">
                  <span class="global-nav__primary-link-text">Notifications</span>
                </a>
              </li>
            </ul>
          </nav>
        </header>
        <main>
          <section id="profile-core">
            <h1>Tomas Roda</h1>
          </section>
          <section id="activity-card">
            <h2 id="activity-heading">Activity</h2>
            <div>activity content</div>
          </section>
          <aside class="scaffold-layout__aside" id="profile-aside">
            <section class="ad-banner-container" id="profile-ad-banner">
              <iframe data-ad-banner="" class="ad-banner" title="advertisement"></iframe>
            </section>
            <section id="viewers-card">
              <h2>Who your viewers also viewed</h2>
              <div>suggestions</div>
            </section>
            <section id="people-card">
              <h2>People you may know</h2>
              <div>people</div>
            </section>
          </aside>
        </main>
      </body>
    </html>`,
    {
      pretendToBeVisual: true,
      url: "https://www.linkedin.com/in/tomasroda/"
    }
  );
}

test("manifest registers CSS, content script, and web assets for LinkedIn", () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "LockdIn");
  assert.equal(manifest.background.service_worker, "background.js");
  assert.deepEqual(manifest.permissions, ["storage", "tabs"]);
  assert.equal(manifest.content_scripts.length, 1);
  assert.deepEqual(manifest.content_scripts[0].matches, ["https://www.linkedin.com/*"]);
  assert.equal(manifest.content_scripts[0].all_frames, true);
  assert.deepEqual(manifest.content_scripts[0].css, ["feed-block.css"]);
  assert.deepEqual(manifest.content_scripts[0].js, ["content.js"]);
  assert.equal(manifest.content_scripts[0].run_at, "document_start");
  assert.deepEqual(manifest.icons, {
    "16": "assets/icons/icon-16.png",
    "32": "assets/icons/icon-32.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  });
  assert.ok(fs.existsSync(path.join(iconDir, "icon-16.png")));
  assert.ok(fs.existsSync(path.join(iconDir, "icon-32.png")));
  assert.ok(fs.existsSync(path.join(iconDir, "icon-48.png")));
  assert.ok(fs.existsSync(path.join(iconDir, "icon-128.png")));
  assert.deepEqual(manifest.web_accessible_resources[0].resources, [
    "assets/fonts/*",
    "assets/images/*",
    "assets/icons/*"
  ]);
});

test("content script hides feed, news, and notifications while injecting the replacement panel", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createDom(stylesheet);
  return withMockChrome(createMockChrome(), () => {
    const runtime = {};
    const result = contentScript.applyLinkHidinExperience(dom.window.document, {
      runtime,
      random: () => 0,
      startRotation: false,
      messages: ["Keep going.", "Next sentence."]
    });

    const feedColumn = dom.window.document.getElementById("feed-column");
    const newsColumn = dom.window.document.getElementById("news-column");
    const notificationsNav = dom.window.document.getElementById("notifications-nav");
    const jobsNav = dom.window.document.getElementById("jobs-nav");
    const layout = dom.window.document.getElementById("layout");
    const leftColumn = dom.window.document.getElementById("left-column");
    const panel = dom.window.document.getElementById("linkhidin-panel");

    assert.equal(result.applied, true);
    assert.equal(dom.window.getComputedStyle(feedColumn).display, "none");
    assert.equal(dom.window.getComputedStyle(newsColumn).display, "none");
    assert.equal(dom.window.getComputedStyle(notificationsNav).display, "none");
    assert.notEqual(dom.window.getComputedStyle(jobsNav).display, "none");
    assert.ok(panel);
    assert.equal(dom.window.getComputedStyle(layout).display, "flex");
    assert.equal(layout.dataset.linkhidinLayout, "two-column");
    assert.equal(leftColumn.dataset.linkhidinLeftRail, "true");
    assert.equal(panel.previousElementSibling, leftColumn);
    assert.equal(panel.querySelector("#linkhidin-panel-sentence").textContent, "Keep going.");
    assert.match(
      panel.style.getPropertyValue("--linkhidin-background-image"),
      /^url\("chrome-extension:\/\/test-extension-id\/assets\/images\//
    );
    assert.equal(dom.window.document.body.dataset.linkhidinHasPanel, "true");
  });
});

test("rotating copy covers 50 sentences and advances deterministically", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createDom(stylesheet);
  const runtime = {};
  const messages = ["First", "Second", "Third"];
  const result = contentScript.applyLinkHidinExperience(dom.window.document, {
    runtime,
    random: () => 0,
    startRotation: false,
    messages,
    imageUrls: ["/images/backdrop.jpg"]
  });

  assert.equal(contentScript.MOTIVATIONAL_SENTENCES.length, 50);
  contentScript.advancePanelSentence(runtime, result.panel, messages);
  assert.equal(result.panel.querySelector("#linkhidin-panel-sentence").textContent, "Second");
  contentScript.advancePanelSentence(runtime, result.panel, messages);
  assert.equal(result.panel.querySelector("#linkhidin-panel-sentence").textContent, "Third");
});

test("messaging page re-renders still hide notifications and scaffold aside", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createMessagingDom(stylesheet);
  const result = contentScript.applyLinkHidinExperience(dom.window.document, {
    runtime: {}
  });

  const notificationsNav = dom.window.document.getElementById("notifications-nav");
  const messagingNav = dom.window.document.getElementById("messaging-nav");
  const aside = dom.window.document.getElementById("messaging-aside");
  const adBanner = dom.window.document.getElementById("ad-banner-container");

  assert.equal(result.applied, true);
  assert.equal(result.notificationsHidden, 1);
  assert.equal(result.asidesHidden, 3);
  assert.equal(dom.window.getComputedStyle(notificationsNav).display, "none");
  assert.notEqual(dom.window.getComputedStyle(messagingNav).display, "none");
  assert.equal(dom.window.getComputedStyle(aside).display, "none");
  assert.equal(dom.window.getComputedStyle(adBanner).display, "none");
});

test("profile page hides notifications, ad rail, and social sections", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createProfileDom(stylesheet);
  const result = contentScript.applyLinkHidinExperience(dom.window.document, {
    runtime: {}
  });

  const jobsItem = dom.window.document.getElementById("jobs-item");
  const notificationsItem = dom.window.document.getElementById("notifications-item");
  const profileAside = dom.window.document.getElementById("profile-aside");
  const adBanner = dom.window.document.getElementById("profile-ad-banner");
  const viewersCard = dom.window.document.getElementById("viewers-card");
  const peopleCard = dom.window.document.getElementById("people-card");
  const activityCard = dom.window.document.getElementById("activity-card");

  assert.equal(result.notificationsHidden, 1);
  assert.equal(result.asidesHidden, 3);
  assert.equal(result.socialSectionsHidden, 3);
  assert.notEqual(dom.window.getComputedStyle(jobsItem).display, "none");
  assert.equal(dom.window.getComputedStyle(notificationsItem).display, "none");
  assert.equal(dom.window.getComputedStyle(profileAside).display, "none");
  assert.equal(dom.window.getComputedStyle(adBanner).display, "none");
  assert.equal(dom.window.getComputedStyle(viewersCard).display, "none");
  assert.equal(dom.window.getComputedStyle(peopleCard).display, "none");
  assert.equal(dom.window.getComputedStyle(activityCard).display, "none");
});

test("notifications hiding does not remove adjacent jobs nav items", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createWrappedNavDom(stylesheet);
  const result = contentScript.applyLinkHidinExperience(dom.window.document, {
    runtime: {}
  });

  const jobsItem = dom.window.document.getElementById("jobs-item");
  const notificationsItem = dom.window.document.getElementById("notifications-item");

  assert.equal(result.notificationsHidden, 1);
  assert.notEqual(dom.window.getComputedStyle(jobsItem).display, "none");
  assert.equal(dom.window.getComputedStyle(notificationsItem).display, "none");
});

test("jobs aria-label mentioning notifications does not get treated as the notifications tab", () => {
  assert.equal(contentScript.isNotificationsLabel("Jobs, 0 new notifications"), false);
  assert.equal(contentScript.isNotificationsLabel("Notifications"), true);
  assert.equal(contentScript.isNotificationsLabel("Notifications, 1 new notification"), true);
});

test("runtime style injects the bundled font with a resolved asset URL", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createNonTargetDom(stylesheet);
  return withMockChrome(createMockChrome(), () => {
    const style = contentScript.ensureRuntimeStyles(dom.window.document);

    assert.ok(style);
    assert.match(style.textContent, /@font-face/);
    assert.match(style.textContent, /Bricolage Grotesque/);
    assert.match(
      style.textContent,
      /chrome-extension:\/\/test-extension-id\/assets\/fonts\/BricolageGrotesque-SemiBold\.ttf/
    );
  });
});

test("runtime style injection is idempotent across repeated syncs", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createNonTargetDom(stylesheet);
  return withMockChrome(createMockChrome(), () => {
    const style = contentScript.ensureRuntimeStyles(dom.window.document);
    const firstTextNode = style.firstChild;
    const secondStyle = contentScript.ensureRuntimeStyles(dom.window.document);

    assert.equal(secondStyle, style);
    assert.equal(secondStyle.firstChild, firstTextNode);
  });
});

test("asset resolution still renders the feed panel and font-face when runtime getURL throws", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createDom(stylesheet);

  return withMockChrome(
    createMockChrome({
      runtime: {
        getURL() {
          throw new Error("Extension context invalidated.");
        }
      }
    }),
    () => {
      const style = contentScript.ensureRuntimeStyles(dom.window.document);
      const result = contentScript.applyLinkHidinExperience(dom.window.document, {
        runtime: {},
        random: () => 0,
        startRotation: false,
        messages: ["Keep going."]
      });
      const panel = dom.window.document.getElementById("linkhidin-panel");

      assert.ok(style);
      assert.ok(panel);
      assert.equal(panel.querySelector("#linkhidin-panel-sentence").textContent, "Keep going.");
      assert.match(
        panel.style.getPropertyValue("--linkhidin-background-image"),
        /^url\("chrome-extension:\/\/test-extension-id\/assets\/images\//
      );
      assert.match(
        style.textContent,
        /chrome-extension:\/\/test-extension-id\/assets\/fonts\/BricolageGrotesque-SemiBold\.ttf/
      );
    }
  );
});

test("stored enabled state defaults to true when chrome storage is unavailable", async () => {
  const originalChrome = global.chrome;
  delete global.chrome;

  try {
    const enabled = await contentScript.getStoredEnabledState();
    assert.equal(enabled, true);
  } finally {
    global.chrome = originalChrome;
  }
});

test("live linkedin nav shape keeps jobs visible while hiding notifications", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createLiveLinkedInNavDom(stylesheet);
  const result = contentScript.applyLinkHidinExperience(dom.window.document, {
    runtime: {}
  });

  const jobsItem = dom.window.document.getElementById("jobs-item");
  const notificationsItem = dom.window.document.getElementById("notifications-item");

  assert.equal(result.notificationsHidden, 1);
  assert.notEqual(dom.window.getComputedStyle(jobsItem).display, "none");
  assert.equal(dom.window.getComputedStyle(notificationsItem).display, "none");
});

test("document_start gating reveals the page after the extension finishes applying", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createDom(stylesheet);
  const runtime = contentScript.initializeLinkHidin(dom.window.document, {
    startRotation: false,
    revealTimeoutMs: 10
  });

  assert.equal(dom.window.document.documentElement.hasAttribute("data-lockdin-pending"), false);
  assert.equal(runtime.pending, false);
});

test("non-target routes are not paint-gated", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createNonTargetDom(stylesheet);
  const runtime = contentScript.initializeLinkHidin(dom.window.document, {
    startRotation: false,
    revealTimeoutMs: 10
  });

  assert.equal(dom.window.document.documentElement.hasAttribute("data-lockdin-pending"), false);
  assert.equal(runtime.pending, false);
  assert.equal(contentScript.getRouteKind(dom.window.document), null);
});

test("top-level profile host skips initialization while preload iframe remains eligible", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const profileDom = createProfileDom(stylesheet);
  const preloadDom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/preload/",
    '<section id="profile-core"><h1>Tomas Roda</h1></section>'
  );

  assert.equal(contentScript.shouldInitializeLinkHidin(profileDom.window.document), false);
  assert.equal(contentScript.shouldInitializeLinkHidin(preloadDom.window.document), true);
});

test("preload iframe document still hides notifications and ads without paint gating", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/preload/",
    '<section id="profile-core"><h1>Tomas Roda</h1></section>'
  );
  const runtime = contentScript.initializeLinkHidin(dom.window.document, {
    startRotation: false,
    revealTimeoutMs: 10
  });

  assert.equal(dom.window.document.documentElement.hasAttribute("data-lockdin-pending"), false);
  assert.equal(runtime.pending, false);
  assertInvariantsHold(dom.window.document, "preload-frame");
});

test("client-side navigation to messaging reapplies nav and ad hiding without a refresh", async () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createDom(stylesheet);

  contentScript.initializeLinkHidin(dom.window.document, {
    startRotation: false,
    revealTimeoutMs: 10
  });

  dom.window.document.body.innerHTML = `
    <header class="global-nav">
      <nav aria-label="Primary Navigation">
        <ul class="global-nav__primary-items">
          <li class="global-nav__primary-item" id="jobs-item">
            <a class="global-nav__primary-link" href="https://www.linkedin.com/jobs/?" title="Jobs">
              <span class="global-nav__primary-link-text">Jobs</span>
            </a>
          </li>
          <li class="global-nav__primary-item" id="notifications-item">
            <a class="global-nav__primary-link" href="https://www.linkedin.com/notifications/?" title="Notifications">
              <div class="global-nav__primary-link-notif">
                <span class="a11y-text">1 new notification</span>
              </div>
              <span class="global-nav__primary-link-text">Notifications</span>
            </a>
          </li>
        </ul>
      </nav>
    </header>
    <main>
      <section id="messages-pane">messages</section>
      <aside class="scaffold-layout__aside" id="messaging-aside">
        <section class="ad-banner-container" id="ad-banner-container">
          <iframe data-ad-banner="" class="ad-banner" title="advertisement"></iframe>
        </section>
      </aside>
    </main>
  `;

  dom.window.history.pushState({}, "", "/messaging/thread/test");

  await new Promise((resolve) => {
    dom.window.requestAnimationFrame(() => {
      dom.window.setTimeout(resolve, 0);
    });
  });

  const jobsItem = dom.window.document.getElementById("jobs-item");
  const notificationsItem = dom.window.document.getElementById("notifications-item");
  const aside = dom.window.document.getElementById("messaging-aside");
  const adBanner = dom.window.document.getElementById("ad-banner-container");

  assert.notEqual(dom.window.getComputedStyle(jobsItem).display, "none");
  assert.equal(dom.window.getComputedStyle(notificationsItem).display, "none");
  assert.equal(dom.window.getComputedStyle(aside).display, "none");
  assert.equal(dom.window.getComputedStyle(adBanner).display, "none");
});

test("client-side navigation to profile reapplies notifications and social cleanup without a refresh", async () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createDom(stylesheet);

  contentScript.initializeLinkHidin(dom.window.document, {
    startRotation: false,
    revealTimeoutMs: 10
  });

  dom.window.document.body.innerHTML = `
    <header class="global-nav">
      <nav aria-label="Primary Navigation">
        <ul class="global-nav__primary-items">
          <li class="global-nav__primary-item" id="jobs-item">
            <a class="global-nav__primary-link" href="https://www.linkedin.com/jobs/?" title="Jobs">
              <span class="global-nav__primary-link-text">Jobs</span>
            </a>
          </li>
          <li class="global-nav__primary-item" id="notifications-item">
            <a class="global-nav__primary-link" href="https://www.linkedin.com/notifications/?" title="Notifications">
              <span class="global-nav__primary-link-text">Notifications</span>
            </a>
          </li>
        </ul>
      </nav>
    </header>
    <main>
      <section id="profile-core">
        <h1>Tomas Roda</h1>
      </section>
      <aside class="scaffold-layout__aside" id="profile-aside">
        <section class="ad-banner-container" id="profile-ad-banner">
          <iframe data-ad-banner="" class="ad-banner" title="advertisement"></iframe>
        </section>
        <section id="viewers-card">
          <h2>Who your viewers also viewed</h2>
          <div>suggestions</div>
        </section>
      </aside>
    </main>
  `;

  dom.window.history.pushState({}, "", "/in/tomasroda/");

  await new Promise((resolve) => {
    dom.window.requestAnimationFrame(() => {
      dom.window.setTimeout(resolve, 0);
    });
  });

  const jobsItem = dom.window.document.getElementById("jobs-item");
  const notificationsItem = dom.window.document.getElementById("notifications-item");
  const profileAside = dom.window.document.getElementById("profile-aside");
  const viewersCard = dom.window.document.getElementById("viewers-card");

  assert.notEqual(dom.window.getComputedStyle(jobsItem).display, "none");
  assert.equal(dom.window.getComputedStyle(notificationsItem).display, "none");
  assert.equal(dom.window.getComputedStyle(profileAside).display, "none");
  assert.equal(dom.window.getComputedStyle(viewersCard).display, "none");
});

// ========================================================================
// INVARIANT TESTS
// ========================================================================

const LINKEDIN_NAV_HTML = `
  <header class="global-nav">
    <nav aria-label="Primary Navigation">
      <ul class="global-nav__primary-items">
        <li class="global-nav__primary-item" id="jobs-item">
          <a class="global-nav__primary-link" href="https://www.linkedin.com/jobs/?" title="Jobs">
            <span class="global-nav__primary-link-text">Jobs</span>
          </a>
        </li>
        <li class="global-nav__primary-item" id="notifications-item">
          <a class="global-nav__primary-link" href="https://www.linkedin.com/notifications/?" title="Notifications">
            <div class="global-nav__primary-link-notif">
              <span class="a11y-text">3 new notifications</span>
            </div>
            <span class="global-nav__primary-link-text">Notifications</span>
          </a>
        </li>
        <li class="global-nav__primary-item" id="messaging-item">
          <a class="global-nav__primary-link" href="https://www.linkedin.com/messaging/?" title="Messaging">
            <span class="global-nav__primary-link-text">Messaging</span>
          </a>
        </li>
      </ul>
    </nav>
  </header>
`;

const AD_SIDEBAR_HTML = `
  <aside class="scaffold-layout__aside" id="ad-aside">
    <section class="ad-banner-container" id="ad-banner">
      <iframe data-ad-banner="" class="ad-banner" title="advertisement"></iframe>
    </section>
  </aside>
`;

function assertInvariantsHold(doc, label) {
  const notificationsItem = doc.getElementById("notifications-item");
  const jobsItem = doc.getElementById("jobs-item");
  const messagingItem = doc.getElementById("messaging-item");
  const adAside = doc.getElementById("ad-aside");
  const adBanner = doc.getElementById("ad-banner");

  if (notificationsItem) {
    assert.equal(
      doc.defaultView.getComputedStyle(notificationsItem).display,
      "none",
      `[${label}] Notifications nav must be hidden`
    );
  }

  if (jobsItem) {
    assert.notEqual(
      doc.defaultView.getComputedStyle(jobsItem).display,
      "none",
      `[${label}] Jobs nav must remain visible`
    );
  }

  if (messagingItem) {
    assert.notEqual(
      doc.defaultView.getComputedStyle(messagingItem).display,
      "none",
      `[${label}] Messaging nav must remain visible`
    );
  }

  if (adAside) {
    assert.equal(
      doc.defaultView.getComputedStyle(adAside).display,
      "none",
      `[${label}] Ad sidebar must be hidden`
    );
  }

  if (adBanner) {
    assert.equal(
      doc.defaultView.getComputedStyle(adBanner).display,
      "none",
      `[${label}] Ad banner must be hidden`
    );
  }
}

function createPageDom(stylesheet, url, mainContent) {
  return new JSDOM(
    `<!doctype html>
    <html>
      <head><style>${stylesheet}</style></head>
      <body>
        ${LINKEDIN_NAV_HTML}
        <main>${mainContent || ""}${AD_SIDEBAR_HTML}</main>
      </body>
    </html>`,
    { pretendToBeVisual: true, url }
  );
}

test("INVARIANT: CSS alone hides notifications nav and ad sidebar selectors", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");

  assert.match(stylesheet, /scaffold-layout__aside/, "CSS must target scaffold-layout__aside");
  assert.match(stylesheet, /ad-banner-container/, "CSS must target ad-banner-container");
  assert.match(stylesheet, /data-ad-banner/, "CSS must target iframe[data-ad-banner]");
  assert.match(stylesheet, /\/notifications/, "CSS must target notification hrefs");

  const dom = createPageDom(stylesheet, "https://www.linkedin.com/jobs/");
  const doc = dom.window.document;
  const adAside = doc.getElementById("ad-aside");
  const adBanner = doc.getElementById("ad-banner");

  assert.equal(
    dom.window.getComputedStyle(adAside).display,
    "none",
    "scaffold-layout__aside hidden by CSS alone"
  );
  assert.equal(
    dom.window.getComputedStyle(adBanner).display,
    "none",
    "ad-banner-container hidden by CSS alone"
  );
});

test("INVARIANT: JS cleanup hides notifications and ads on feed page", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(stylesheet, "https://www.linkedin.com/feed/");
  contentScript.applyLinkHidinExperience(dom.window.document, { runtime: {} });
  assertInvariantsHold(dom.window.document, "feed");
});

test("INVARIANT: JS cleanup hides notifications and ads on messaging page", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/messaging/thread/test",
    '<section id="messages-pane">messages</section>'
  );
  contentScript.applyLinkHidinExperience(dom.window.document, { runtime: {} });
  assertInvariantsHold(dom.window.document, "messaging");
});

test("INVARIANT: JS cleanup hides notifications and ads on profile page", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/in/tomasroda/",
    '<section><h1>Tomas Roda</h1></section>'
  );
  contentScript.applyLinkHidinExperience(dom.window.document, { runtime: {} });
  assertInvariantsHold(dom.window.document, "profile");
});

test("INVARIANT: JS cleanup hides notifications and ads on jobs page", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/jobs/collections/recommended/",
    '<section id="jobs-list">jobs</section>'
  );
  contentScript.applyLinkHidinExperience(dom.window.document, { runtime: {} });
  assertInvariantsHold(dom.window.document, "jobs");
});

test("INVARIANT: JS cleanup hides notifications and ads on search page", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/search/results/all/?keywords=test",
    '<section id="search-results">results</section>'
  );
  contentScript.applyLinkHidinExperience(dom.window.document, { runtime: {} });
  assertInvariantsHold(dom.window.document, "search");
});

test("INVARIANT: JS cleanup hides notifications and ads on mynetwork page", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/mynetwork/",
    '<section id="network">network</section>'
  );
  contentScript.applyLinkHidinExperience(dom.window.document, { runtime: {} });
  assertInvariantsHold(dom.window.document, "mynetwork");
});

test("INVARIANT: SPA navigation from jobs to messaging maintains invariants", async () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/jobs/",
    '<section id="jobs-list">jobs</section>'
  );

  contentScript.initializeLinkHidin(dom.window.document, {
    startRotation: false,
    revealTimeoutMs: 10
  });

  assertInvariantsHold(dom.window.document, "jobs-before-nav");

  dom.window.document.body.innerHTML = `
    ${LINKEDIN_NAV_HTML}
    <main>
      <section id="messages-pane">messages</section>
      ${AD_SIDEBAR_HTML}
    </main>
  `;

  dom.window.history.pushState({}, "", "/messaging/thread/test");

  await new Promise((resolve) => {
    dom.window.requestAnimationFrame(() => {
      dom.window.setTimeout(resolve, 0);
    });
  });

  assertInvariantsHold(dom.window.document, "messaging-after-nav");
});

test("INVARIANT: SPA navigation from messaging to profile maintains invariants", async () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/messaging/thread/test",
    '<section id="messages-pane">messages</section>'
  );

  contentScript.initializeLinkHidin(dom.window.document, {
    startRotation: false,
    revealTimeoutMs: 10
  });

  assertInvariantsHold(dom.window.document, "messaging-before-nav");

  dom.window.document.body.innerHTML = `
    ${LINKEDIN_NAV_HTML}
    <main>
      <section><h1>Tomas Roda</h1></section>
      ${AD_SIDEBAR_HTML}
    </main>
  `;

  dom.window.history.pushState({}, "", "/in/tomasroda/");

  await new Promise((resolve) => {
    dom.window.requestAnimationFrame(() => {
      dom.window.setTimeout(resolve, 0);
    });
  });

  assertInvariantsHold(dom.window.document, "profile-after-nav");
});

test("INVARIANT: SPA navigation from feed to jobs maintains invariants", async () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(stylesheet, "https://www.linkedin.com/feed/");

  contentScript.initializeLinkHidin(dom.window.document, {
    startRotation: false,
    revealTimeoutMs: 10
  });

  assertInvariantsHold(dom.window.document, "feed-before-nav");

  dom.window.document.body.innerHTML = `
    ${LINKEDIN_NAV_HTML}
    <main>
      <section id="jobs-list">jobs</section>
      ${AD_SIDEBAR_HTML}
    </main>
  `;

  dom.window.history.pushState({}, "", "/jobs/collections/recommended/");

  await new Promise((resolve) => {
    dom.window.requestAnimationFrame(() => {
      dom.window.setTimeout(resolve, 0);
    });
  });

  assertInvariantsHold(dom.window.document, "jobs-after-nav");
});

test("INVARIANT: delayed DOM injection after route change is still caught", async () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(stylesheet, "https://www.linkedin.com/feed/");

  contentScript.initializeLinkHidin(dom.window.document, {
    startRotation: false,
    revealTimeoutMs: 10
  });

  dom.window.history.pushState({}, "", "/messaging/thread/test");

  await new Promise((resolve) => {
    dom.window.requestAnimationFrame(() => {
      dom.window.setTimeout(resolve, 0);
    });
  });

  dom.window.document.body.innerHTML = `
    ${LINKEDIN_NAV_HTML}
    <main>
      <section id="messages-pane">messages</section>
      ${AD_SIDEBAR_HTML}
    </main>
  `;

  await new Promise((resolve) => setTimeout(resolve, 300));

  assertInvariantsHold(dom.window.document, "delayed-messaging");
});

test("hasUnhiddenDistractingContent detects unhidden notifications and asides", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/messaging/thread/test",
    '<section id="messages-pane">messages</section>'
  );
  const doc = dom.window.document;

  assert.equal(contentScript.hasUnhiddenDistractingContent(doc), true);

  contentScript.applyLinkHidinExperience(doc, { runtime: {} });

  assert.equal(contentScript.hasUnhiddenDistractingContent(doc), false);
});

test("hasUnhiddenDistractingContent returns true when LinkedIn strips our hidden attribute", () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/messaging/thread/test",
    '<section id="messages-pane">messages</section>'
  );
  const doc = dom.window.document;

  contentScript.applyLinkHidinExperience(doc, { runtime: {} });
  assert.equal(contentScript.hasUnhiddenDistractingContent(doc), false);

  const notificationsItem = doc.getElementById("notifications-item");
  notificationsItem.removeAttribute("data-linkhidin-hidden");

  assert.equal(contentScript.hasUnhiddenDistractingContent(doc), true);
});

test("INVARIANT: URL polling catches navigation that bypasses History API", async () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/feed/",
    '<section id="feed-content">feed</section>'
  );
  const doc = dom.window.document;

  contentScript.initializeLinkHidin(doc, {
    startRotation: false,
    revealTimeoutMs: 10,
    urlPollingMs: 50
  });

  assertInvariantsHold(doc, "feed-before-stealth-nav");

  doc.body.innerHTML = `
    ${LINKEDIN_NAV_HTML}
    <main>
      <section id="messages-pane">messages</section>
      ${AD_SIDEBAR_HTML}
    </main>
  `;

  dom.reconfigure({ url: "https://www.linkedin.com/messaging/thread/test" });

  await new Promise((resolve) => setTimeout(resolve, 200));

  assertInvariantsHold(doc, "messaging-after-stealth-nav");
});

test("INVARIANT: attribute stripping by LinkedIn framework triggers re-hide via MutationObserver", async () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/messaging/thread/test",
    '<section id="messages-pane">messages</section>'
  );
  const doc = dom.window.document;

  contentScript.initializeLinkHidin(doc, {
    startRotation: false,
    revealTimeoutMs: 10
  });

  assertInvariantsHold(doc, "messaging-before-strip");

  const adAside = doc.getElementById("ad-aside");
  adAside.removeAttribute("data-linkhidin-hidden");

  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.ok(
    adAside.hasAttribute("data-linkhidin-hidden"),
    "MutationObserver must re-apply hidden attribute after LinkedIn strips it"
  );
});

test("INVARIANT: visibilitychange on tab focus triggers cleanup", async () => {
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const dom = createPageDom(
    stylesheet,
    "https://www.linkedin.com/messaging/thread/test",
    '<section id="messages-pane">messages</section>'
  );
  const doc = dom.window.document;

  contentScript.initializeLinkHidin(doc, {
    startRotation: false,
    revealTimeoutMs: 10
  });

  assertInvariantsHold(doc, "messaging-before-visibility");

  const adAside = doc.getElementById("ad-aside");
  adAside.removeAttribute("data-linkhidin-hidden");
  adAside.removeAttribute("aria-hidden");
  const notificationsItem = doc.getElementById("notifications-item");
  notificationsItem.removeAttribute("data-linkhidin-hidden");
  notificationsItem.removeAttribute("aria-hidden");

  Object.defineProperty(doc, "hidden", { value: false, writable: true, configurable: true });
  doc.dispatchEvent(new dom.window.Event("visibilitychange"));

  await new Promise((resolve) => setTimeout(resolve, 300));

  assertInvariantsHold(doc, "messaging-after-visibility");
});
