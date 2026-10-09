function byId(id){
  return document.getElementById(id);
}

const SETTINGS = {
  EMAIL_USER: "jaime",
  EMAIL_DOMAIN: "bagdigital.tech"
};

function buildEmail(){
  return `${SETTINGS.EMAIL_USER}@${SETTINGS.EMAIL_DOMAIN}`;
}

function directEmailHref(){
  return `mailto:${encodeURIComponent(buildEmail())}`;
}

function setNavState(open){
  const nav = byId("primaryNav");
  const toggle = byId("navToggle");
  if (!nav || !toggle) return;

  nav.dataset.open = open ? "true" : "false";
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
}

document.addEventListener("DOMContentLoaded", () => {
  const year = byId("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const email = buildEmail();
  const emailLink = byId("emailLink");
  if (emailLink){
    emailLink.textContent = email;
    emailLink.setAttribute("href", directEmailHref());
  }

  const emailButton = byId("emailDirectBtn");
  if (emailButton) emailButton.setAttribute("href", directEmailHref());

  const toggle = byId("navToggle");
  if (toggle){
    toggle.addEventListener("click", () => {
      const nav = byId("primaryNav");
      const isOpen = nav && nav.dataset.open === "true";
      setNavState(!isOpen);
    });
  }

  document.querySelectorAll("[data-close-nav]").forEach((link) => {
    link.addEventListener("click", () => {
      const nav = byId("primaryNav");
      const wasOpenOnMobile =
        nav?.dataset.open === "true" &&
        window.matchMedia("(max-width: 940px)").matches;

      setNavState(false);

      if (!wasOpenOnMobile) return;

      // Move keyboard focus to the destination rather than leaving it in
      // a navigation link that becomes hidden when the mobile menu closes.
      const destination = link.getAttribute("href");
      if (!destination?.startsWith("#")) return;

      const section = byId(destination.slice(1));
      if (!section) return;

      section.setAttribute("tabindex", "-1");
      section.focus({ preventScroll: true });
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    const nav = byId("primaryNav");
    const toggle = byId("navToggle");
    const shouldRestoreFocus =
      nav?.dataset.open === "true" &&
      (nav.contains(document.activeElement) || document.activeElement === toggle);

    setNavState(false);

    // Avoid stranding keyboard focus in links that become hidden on mobile.
    if (shouldRestoreFocus) toggle?.focus();
  });

});
