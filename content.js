const FEED_SELECTOR = '[componentkey="container-update-list_mainFeed-lazy-container"]';
const NEWS_TEXT = "linkedin news";
const PANEL_ID = "linkhidin-panel";
const PANEL_SENTENCE_ID = "linkhidin-panel-sentence";
const HIDDEN_ATTR = "data-linkhidin-hidden";
const PENDING_ATTR = "data-lockdin-pending";
const RUNTIME_STYLE_ID = "lockdin-runtime-style";
const NOTIFICATIONS_TEXT = "notifications";
const SOCIAL_SECTION_TITLES = new Set([
  "activity",
  "featured",
  "recommendations",
  "who your viewers also viewed",
  "people you may know",
  "you might like"
]);
const BACKGROUND_IMAGES = [
  "assets/images/workspace-plants.jpg",
  "assets/images/studio-chair.jpg",
  "assets/images/desk-hello.jpg",
  "assets/images/dolomites.jpg",
  "assets/images/sunrise-peaks.jpg"
];
const MOTIVATIONAL_SENTENCES = [
  "Your next role is built one focused hour at a time.",
  "A calm search beats a frantic scroll every single day.",
  "Momentum compounds when you protect your attention.",
  "The application you send after real thought lands harder.",
  "Small disciplined moves create surprisingly large outcomes.",
  "You do not need more noise; you need one clear next step.",
  "Consistency is louder than urgency over the course of a week.",
  "The right opportunity is easier to notice when your mind is quiet.",
  "Protecting your energy is part of the work.",
  "A steady job search is still a strong job search.",
  "Deep work is often the shortest path to visible progress.",
  "One refined message can outperform ten rushed ones.",
  "Your attention is valuable enough to defend.",
  "A thoughtful portfolio page can speak while you sleep.",
  "The right recruiter will notice clarity before volume.",
  "You are allowed to build your day around intention.",
  "An honest outreach note is better than a generic perfect one.",
  "Progress usually looks ordinary while it is happening.",
  "The habits that feel small today shape the offers you see later.",
  "Real traction starts when you stop refreshing and start creating.",
  "A stronger future often begins with a quieter tab.",
  "Clarity is a career advantage, not a luxury.",
  "Good work gets easier when your brain has room to think.",
  "A focused morning can rescue an entire week.",
  "Use this space to move one real task across the line.",
  "You are closer when you choose action over drift.",
  "The next breakthrough may come from the work you finish today.",
  "Keep your standards high and your process sustainable.",
  "The right pace is the one you can repeat tomorrow.",
  "A career grows faster when your inputs are deliberate.",
  "You do not need to chase every signal to make progress.",
  "The search gets sharper when you define what matters most.",
  "Intentional effort leaves a stronger impression than constant presence.",
  "You can turn this pause into proof.",
  "A better role often begins with a better routine.",
  "Focus is a competitive edge most people give away.",
  "A clear application beats a clever distraction.",
  "Your work deserves the version of you that is fully here.",
  "There is relief in narrowing the day to one useful thing.",
  "Quiet confidence is built through repeated follow-through.",
  "Protect this block and let the rest wait.",
  "The next email, edit, or outreach can change the month.",
  "Better opportunities respond to better preparation.",
  "You are building evidence, not just hope.",
  "Use this window to make something future-you will thank you for.",
  "Steady output turns uncertainty into direction.",
  "This is a good moment to choose depth over dopamine.",
  "Thoughtful work is rarely wasted effort.",
  "A well-used hour can be more valuable than a busy afternoon.",
  "Keep going long enough for your preparation to become visible."
];

function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function isNotificationsLabel(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return false;
  }

  return (
    normalized === NOTIFICATIONS_TEXT ||
    normalized.startsWith(`${NOTIFICATIONS_TEXT},`) ||
    normalized.startsWith(`${NOTIFICATIONS_TEXT} `)
  );
}

function isJobsLabel(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return false;
  }

  return normalized === "jobs" || normalized.startsWith("jobs,");
}

function isExtensionContextValid() {
  try {
    return Boolean(
      typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id
    );
  } catch (_) {
    return false;
  }
}

function resolveAssetUrl(assetPath) {
  if (typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function") {
    try {
      return chrome.runtime.getURL(assetPath);
    } catch (_) {
      return null;
    }
  }

  return assetPath;
}

function getRuntime(view) {
  const targetView = view || (typeof window !== "undefined" ? window : undefined);

  if (!targetView) {
    return {};
  }

  if (!targetView.__linkhidinRuntime) {
    targetView.__linkhidinRuntime = {};
  }

  return targetView.__linkhidinRuntime;
}

async function getStoredEnabledState() {
  if (
    typeof chrome === "undefined" ||
    !chrome.storage ||
    !chrome.storage.local ||
    typeof chrome.storage.local.get !== "function"
  ) {
    return true;
  }

  try {
    const stored = await chrome.storage.local.get("lockdin-enabled");
    return stored["lockdin-enabled"] !== false;
  } catch (_) {
    return true;
  }
}

function getRouteKind(doc) {
  const pathname = doc.location ? doc.location.pathname : "";

  if (pathname === "/" || pathname.startsWith("/feed")) {
    return "feed";
  }

  if (pathname.startsWith("/messaging")) {
    return "messaging";
  }

  if (pathname.startsWith("/in/")) {
    return "profile";
  }

  return null;
}

function shouldGatePaint(doc) {
  return Boolean(getRouteKind(doc));
}

function setPendingState(doc, isPending) {
  if (!doc.documentElement) {
    return;
  }

  if (isPending) {
    doc.documentElement.setAttribute(PENDING_ATTR, "true");
  } else {
    doc.documentElement.removeAttribute(PENDING_ATTR);
  }
}

function ensureRuntimeStyles(doc) {
  if (!doc.head) {
    return null;
  }

  const fontUrl = resolveAssetUrl("assets/fonts/BricolageGrotesque-SemiBold.ttf");

  if (!fontUrl) {
    return null;
  }

  let style = doc.getElementById(RUNTIME_STYLE_ID);

  if (!style) {
    style = doc.createElement("style");
    style.id = RUNTIME_STYLE_ID;
    doc.head.append(style);
  }

  style.textContent = `
    @font-face {
      font-family: "Bricolage Grotesque";
      src: url("${fontUrl}") format("truetype");
      font-style: normal;
      font-weight: 600;
      font-display: swap;
    }
  `;

  return style;
}

function syncPendingForRoute(doc, runtime, options, reveal) {
  runtime.pending = shouldGatePaint(doc);
  setPendingState(doc, runtime.pending);

  if (runtime.revealTimeoutId) {
    clearTimeout(runtime.revealTimeoutId);
    runtime.revealTimeoutId = null;
  }

  if (runtime.pending) {
    runtime.revealTimeoutId = setTimeout(reveal, options.revealTimeoutMs || 1500);
  }
}

function findNewsParagraph(doc) {
  return Array.from(doc.querySelectorAll("p")).find(
    (paragraph) => normalizeText(paragraph.textContent) === NEWS_TEXT
  );
}

function isSocialSectionTitle(value) {
  return SOCIAL_SECTION_TITLES.has(normalizeText(value));
}

function findSectionContainerFromHeading(heading) {
  let current = heading;

  while (current && current.parentElement) {
    const parent = current.parentElement;
    const siblingHeadings = parent.querySelectorAll("h1, h2, h3");

    if (siblingHeadings.length > 1) {
      return current;
    }

    const className =
      typeof parent.className === "string" ? parent.className.toLowerCase() : "";

    if (
      parent.tagName === "SECTION" ||
      parent.tagName === "LI" ||
      className.includes("artdeco-card") ||
      className.includes("pv-profile-card") ||
      className.includes("profile-card") ||
      className.includes("scaffold-layout__aside")
    ) {
      return parent;
    }

    current = parent;
  }

  return heading;
}

function findSharedContainer(primary, secondary) {
  let current = primary ? primary.parentElement : null;

  while (current) {
    if (current.contains(secondary) && current.children.length >= 2) {
      return current;
    }

    current = current.parentElement;
  }

  return primary ? primary.parentElement : null;
}

function findDirectChild(root, target) {
  let current = target;

  while (current && current.parentElement && current.parentElement !== root) {
    current = current.parentElement;
  }

  return current;
}

function hideElement(element, reason) {
  if (!element) {
    return;
  }

  element.setAttribute(HIDDEN_ATTR, reason || "true");
  element.setAttribute("aria-hidden", "true");
}

function chooseIndex(items, randomFn) {
  if (!items.length) {
    return 0;
  }

  const randomValue = typeof randomFn === "function" ? randomFn() : Math.random();
  return Math.max(0, Math.min(items.length - 1, Math.floor(randomValue * items.length)));
}

function updatePanelSentence(panel, sentence) {
  const sentenceNode = panel.querySelector(`#${PANEL_SENTENCE_ID}`);

  if (sentenceNode) {
    sentenceNode.textContent = sentence;
  }
}

function advancePanelSentence(runtime, panel, messages) {
  if (!panel || !messages.length) {
    return;
  }

  runtime.messageIndex = ((runtime.messageIndex ?? 0) + 1) % messages.length;
  updatePanelSentence(panel, messages[runtime.messageIndex]);
}

function createPanel(doc) {
  const existing = doc.getElementById(PANEL_ID);

  if (existing) {
    return existing;
  }

  const panel = doc.createElement("section");
  panel.id = PANEL_ID;
  panel.setAttribute("aria-live", "polite");
  panel.innerHTML = `
    <div class="linkhidin-panel__content">
      <p class="linkhidin-panel__eyebrow">LinkedIn feed hidden</p>
      <h1 class="linkhidin-panel__title">Protect the work that moves you forward.</h1>
      <p class="linkhidin-panel__sentence" id="${PANEL_SENTENCE_ID}"></p>
      <p class="linkhidin-panel__footnote">Refresh your search, update a portfolio bullet, send one message, then keep going.</p>
    </div>
  `;

  return panel;
}

function ensurePanel(doc, layoutRoot, runtime, options) {
  const messages = options.messages || MOTIVATIONAL_SENTENCES;
  const imageUrls = (options.imageUrls || BACKGROUND_IMAGES).map(resolveAssetUrl).filter(Boolean);

  if (!imageUrls.length) {
    return null;
  }

  const panel = createPanel(doc);

  if (typeof runtime.messageIndex !== "number") {
    runtime.messageIndex = chooseIndex(messages, options.random);
  }

  if (!runtime.backgroundImageUrl) {
    runtime.backgroundImageUrl = imageUrls[chooseIndex(imageUrls, options.random)] || "";
  }

  if (!panel.isConnected) {
    layoutRoot.append(panel);
  }

  panel.style.setProperty("--linkhidin-background-image", `url("${runtime.backgroundImageUrl}")`);
  updatePanelSentence(panel, messages[runtime.messageIndex]);

  const display = doc.defaultView && layoutRoot
    ? doc.defaultView.getComputedStyle(layoutRoot).display
    : "";

  if (display.includes("grid")) {
    panel.style.gridColumn = "auto";
  }

  if (display.includes("flex")) {
    panel.style.flex = "1 1 60vw";
  }

  if (doc.body) {
    doc.body.dataset.linkhidinHasPanel = "true";
  }

  return panel;
}

function hideNotificationsNav(doc) {
  const matchedElements = new Set(
    doc.querySelectorAll(
      [
        'nav[aria-label="Primary Navigation"] a[href*="/notifications"]',
        'nav[aria-label="Primary Navigation"] [title="Notifications"]',
        'nav[aria-label="Primary Navigation"] [aria-label^="Notifications"]'
      ].join(", ")
    )
  );
  const interactiveElements = Array.from(doc.querySelectorAll('a, button, [role="link"]'));
  let hiddenCount = 0;

  for (const element of interactiveElements) {
    const text = normalizeText(element.textContent);
    const ariaLabel = normalizeText(element.getAttribute("aria-label"));
    const dataViewName = normalizeText(element.getAttribute("data-view-name"));
    const href = normalizeText(element.getAttribute("href"));
    const title = normalizeText(element.getAttribute("title"));

    if (
      href.includes("/jobs") ||
      isJobsLabel(text) ||
      isJobsLabel(ariaLabel) ||
      isJobsLabel(title)
    ) {
      continue;
    }

    const isNotificationsLink =
      matchedElements.has(element) ||
      href.includes("/notifications") ||
      dataViewName.includes("notifications") ||
      isNotificationsLabel(title) ||
      isNotificationsLabel(ariaLabel) ||
      isNotificationsLabel(text);

    if (!isNotificationsLink) {
      continue;
    }

    const navRoot =
      element.closest("nav") ||
      element.closest("header") ||
      element.closest('[class*="global-nav"]');
    const container = findNavItemContainer(element, navRoot);

    if (navRoot && container && !container.hasAttribute(HIDDEN_ATTR)) {
      hideElement(container, "notifications");
      hiddenCount += 1;
    }
  }

  return hiddenCount;
}

function findNavItemContainer(element, navRoot) {
  let current = element;

  while (current && current !== navRoot) {
    const role = normalizeText(current.getAttribute("role"));
    const className =
      typeof current.className === "string" ? current.className.toLowerCase() : "";

    if (
      current.tagName === "LI" ||
      role === "listitem" ||
      className.includes("global-nav__primary-item") ||
      className.includes("global-nav__nav-item")
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return element;
}

function hideScaffoldAside(doc) {
  const asides = Array.from(
    doc.querySelectorAll(
      [
        ".scaffold-layout__aside",
        '[class*="scaffold-layout__aside"]',
        ".ad-banner-container",
        "iframe[data-ad-banner]"
      ].join(", ")
    )
  );
  let hiddenCount = 0;

  for (const aside of asides) {
    if (!aside.hasAttribute(HIDDEN_ATTR)) {
      hideElement(aside, "scaffold-aside");
      hiddenCount += 1;
    }
  }

  return hiddenCount;
}

function hideSocialSections(doc) {
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3"));
  let hiddenCount = 0;

  for (const heading of headings) {
    if (!isSocialSectionTitle(heading.textContent)) {
      continue;
    }

    const container = findSectionContainerFromHeading(heading);

    if (container && !container.hasAttribute(HIDDEN_ATTR)) {
      hideElement(container, "social-section");
      hiddenCount += 1;
    }
  }

  return hiddenCount;
}

function isReadyToReveal(doc, result) {
  const routeKind = getRouteKind(doc);

  if (!routeKind) {
    return true;
  }

  if (routeKind === "feed") {
    return Boolean(result.panel);
  }

  if (routeKind === "messaging") {
    return result.notificationsHidden > 0 || result.asidesHidden > 0;
  }

  if (routeKind === "profile") {
    return result.notificationsHidden > 0 || result.asidesHidden > 0 || result.socialSectionsHidden > 0;
  }

  return true;
}

function configureTwoColumnLayout(layoutRoot, feedContainer, newsContainer, panel) {
  if (!layoutRoot || !panel) {
    return;
  }

  const leftRail = Array.from(layoutRoot.children).find(
    (child) => child !== feedContainer && child !== newsContainer && child !== panel && !child.hasAttribute(HIDDEN_ATTR)
  );

  layoutRoot.setAttribute("data-linkhidin-layout", "two-column");
  layoutRoot.style.display = "flex";
  layoutRoot.style.alignItems = "stretch";
  layoutRoot.style.gap = "24px";
  layoutRoot.style.width = "100%";

  for (const child of Array.from(layoutRoot.children)) {
    if (child !== panel) {
      child.removeAttribute("data-linkhidin-left-rail");
    }
  }

  if (leftRail) {
    leftRail.setAttribute("data-linkhidin-left-rail", "true");
    leftRail.style.flex = "0 0 clamp(240px, 24vw, 320px)";
    leftRail.style.minWidth = "0";

    if (panel.previousElementSibling !== leftRail) {
      layoutRoot.insertBefore(panel, leftRail.nextSibling);
    }
  } else if (!panel.isConnected) {
    layoutRoot.append(panel);
  }

  panel.style.flex = "1 1 auto";
  panel.style.minWidth = "0";
}

function applyLinkHidinExperience(doc, options = {}) {
  const runtime = options.runtime || getRuntime(doc.defaultView);
  const feed = doc.querySelector(FEED_SELECTOR);
  const newsParagraph = findNewsParagraph(doc);
  const notificationsHidden = hideNotificationsNav(doc);
  const asidesHidden = hideScaffoldAside(doc);
  const socialSectionsHidden = hideSocialSections(doc);
  let panel = doc.getElementById(PANEL_ID);

  if (feed && newsParagraph) {
    const layoutRoot = findSharedContainer(feed, newsParagraph);
    const feedContainer = layoutRoot ? findDirectChild(layoutRoot, feed) : feed;
    const newsContainer = layoutRoot ? findDirectChild(layoutRoot, newsParagraph) : newsParagraph.closest("div");

    hideElement(feedContainer || feed, "feed");
    hideElement(newsContainer || newsParagraph.closest("div") || newsParagraph, "news");

    if (layoutRoot) {
      panel = ensurePanel(doc, layoutRoot, runtime, options);
      configureTwoColumnLayout(layoutRoot, feedContainer, newsContainer, panel);
    }
  }

  return {
    applied: Boolean(feed || newsParagraph || notificationsHidden || asidesHidden || socialSectionsHidden),
    notificationsHidden,
    asidesHidden,
    socialSectionsHidden,
    panel,
    runtime
  };
}

function isInternalPanelMutation(mutation) {
  const target = mutation.target;

  if (!target || typeof target.closest !== "function") {
    return false;
  }

  return Boolean(target.closest(`#${PANEL_ID}`));
}

function hasUnhiddenDistractingContent(doc) {
  const notificationLinks = doc.querySelectorAll(
    'a[href*="/notifications"], [title="Notifications"], [aria-label^="Notifications"]'
  );

  for (const element of notificationLinks) {
    const container =
      element.closest(".global-nav__primary-item") ||
      element.closest("li") ||
      element;

    if (!container.hasAttribute(HIDDEN_ATTR)) {
      return true;
    }
  }

  const asides = doc.querySelectorAll(
    '.scaffold-layout__aside, [class*="scaffold-layout__aside"], .ad-banner-container, iframe[data-ad-banner]'
  );

  for (const aside of asides) {
    if (!aside.hasAttribute(HIDDEN_ATTR)) {
      return true;
    }
  }

  return false;
}

function initializeLinkHidin(doc = document, options = {}) {
  const runtime = options.runtime || getRuntime(doc.defaultView);
  const messages = options.messages || MOTIVATIONAL_SENTENCES;
  const rotationMs = options.rotationMs || 9000;
  const reveal = () => {
    setPendingState(doc, false);
    runtime.pending = false;

    if (runtime.revealTimeoutId) {
      clearTimeout(runtime.revealTimeoutId);
      runtime.revealTimeoutId = null;
    }
  };
  const runSync = () => {
    const result = applyLinkHidinExperience(doc, { ...options, messages, runtime });

    if (!runtime.pending || isReadyToReveal(doc, result)) {
      reveal();
    }

    return result;
  };

  ensureRuntimeStyles(doc);
  syncPendingForRoute(doc, runtime, options, reveal);
  runtime.lastRoute = doc.location ? doc.location.href : "";

  const result = runSync();

  if (!runtime.intervalId && result.panel && messages.length > 1 && options.startRotation !== false) {
    const rotationId = setInterval(() => {
      const panel = doc.getElementById(PANEL_ID);

      if (panel) {
        advancePanelSentence(runtime, panel, messages);
      }
    }, rotationMs);

    if (typeof rotationId === "object" && typeof rotationId.unref === "function") {
      rotationId.unref();
    }

    runtime.intervalId = rotationId;
  }

  if (!runtime.observer && typeof MutationObserver !== "undefined" && doc.documentElement) {
    runtime.observer = new MutationObserver((mutations) => {
      if (mutations.every(isInternalPanelMutation)) {
        return;
      }

      runSync();
    });

    runtime.observer.observe(doc.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [HIDDEN_ATTR]
    });
  }

  if (!runtime.domContentLoadedBound && doc.defaultView) {
    runtime.domContentLoadedBound = true;
    doc.addEventListener("DOMContentLoaded", runSync, { once: true });
    doc.defaultView.addEventListener("load", runSync, { once: true });
  }

  if (!runtime.routeWatcherBound && doc.defaultView) {
    const view = doc.defaultView;
    const scheduleDelayedChecks = () => {
      if (runtime.delayedCheckIds) {
        runtime.delayedCheckIds.forEach((id) => clearTimeout(id));
      }

      runtime.delayedCheckIds = [];

      for (const delay of [200, 600, 1200]) {
        runtime.delayedCheckIds.push(setTimeout(runSync, delay));
      }
    };
    const handleRouteChange = () => {
      const currentRoute = doc.location ? doc.location.href : "";

      if (currentRoute === runtime.lastRoute) {
        return;
      }

      runtime.lastRoute = currentRoute;
      syncPendingForRoute(doc, runtime, options, reveal);

      if (typeof view.requestAnimationFrame === "function") {
        view.requestAnimationFrame(() => {
          runSync();
        });
      } else {
        setTimeout(runSync, 0);
      }

      scheduleDelayedChecks();
    };

    const wrapHistoryMethod = (methodName) => {
      const original = view.history[methodName];

      if (typeof original !== "function") {
        return;
      }

      view.history[methodName] = function wrappedHistoryMethod(...args) {
        const response = original.apply(this, args);
        handleRouteChange();
        return response;
      };
    };

    wrapHistoryMethod("pushState");
    wrapHistoryMethod("replaceState");
    view.addEventListener("popstate", handleRouteChange);
    view.addEventListener("hashchange", handleRouteChange);

    if (!runtime.urlPollingId) {
      const pollingId = setInterval(() => {
        const currentRoute = doc.location ? doc.location.href : "";

        if (currentRoute !== runtime.lastRoute) {
          handleRouteChange();
          return;
        }

        if (hasUnhiddenDistractingContent(doc)) {
          runSync();
          scheduleDelayedChecks();
        }
      }, options.urlPollingMs || 800);

      if (typeof pollingId === "object" && typeof pollingId.unref === "function") {
        pollingId.unref();
      }

      runtime.urlPollingId = pollingId;
    }

    if (doc.addEventListener) {
      doc.addEventListener("visibilitychange", () => {
        if (!doc.hidden) {
          handleRouteChange();
          scheduleDelayedChecks();
        }
      });
    }

    runtime.routeWatcherBound = true;
  }

  return runtime;
}

if (typeof module !== "undefined") {
  module.exports = {
    FEED_SELECTOR,
    MOTIVATIONAL_SENTENCES,
    BACKGROUND_IMAGES,
    applyLinkHidinExperience,
    advancePanelSentence,
    configureTwoColumnLayout,
    findNewsParagraph,
    findNavItemContainer,
    getRouteKind,
    getStoredEnabledState,
    hasUnhiddenDistractingContent,
    isExtensionContextValid,
    hideNotificationsNav,
    hideScaffoldAside,
    initializeLinkHidin,
    ensureRuntimeStyles,
    isJobsLabel,
    isNotificationsLabel,
    isReadyToReveal,
    syncPendingForRoute,
    normalizeText
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void getStoredEnabledState().then((enabled) => {
    if (enabled) {
      initializeLinkHidin(document);
    }
  });
}
