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

function setStatus(message){
  const status = byId("formStatus");
  if (status) status.textContent = message || "";
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
    link.addEventListener("click", () => setNavState(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setNavState(false);
  });

  const form = byId("quoteForm");
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const ajaxAction = form.getAttribute("data-ajax-action") || "";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    if (!form.checkValidity()){
      form.classList.add("was-validated");
      setStatus("Please fix the highlighted fields and try again.");
      return;
    }

    const data = new FormData(form);
    const honeypot = (data.get("company_site") || "").toString().trim();

    if (honeypot){
      setStatus("Submission blocked.");
      return;
    }

    if (!ajaxAction){
      setStatus("The form is unavailable right now. Please use the direct email link.");
      return;
    }

    if (submitButton) submitButton.disabled = true;
    setStatus("Sending your inquiry…");

    try {
      const response = await fetch(ajaxAction, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data
      });

      if (!response.ok){
        throw new Error(`Request failed with status ${response.status}`);
      }

      form.reset();
      form.classList.remove("was-validated");
      setStatus("Thanks. Your inquiry was sent. BAGDigital will follow up soon.");
    } catch (error) {
      console.error(error);
      setStatus("The form could not be submitted right now. Please use the direct email button.");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
});
