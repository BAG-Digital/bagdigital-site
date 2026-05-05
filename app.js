function $(id){ return document.getElementById(id); }

const SETTINGS = {
  EMAIL_USER: "jaime",
  EMAIL_DOMAIN: "bagdigital.tech"
};

function buildEmail(){ return `${SETTINGS.EMAIL_USER}@${SETTINGS.EMAIL_DOMAIN}`; }

function setStatus(msg){
  const el = $("formStatus");
  if (!el) return;
  el.textContent = msg || "";
}

function directEmailHref(){
  return `mailto:${encodeURIComponent(buildEmail())}`;
}

function closeMobileNavIfOpen(){
  const el = document.getElementById("primaryNav");
  if (!el || typeof bootstrap === "undefined") return;

  // If expanded, hide it after link click
  const inst = bootstrap.Collapse.getInstance(el) || new bootstrap.Collapse(el, { toggle: false });
  inst.hide();
}

/**
 * Reliability mode:
 * - default uses local /assets image
 * - if remote loads successfully, swap to remote
 * - if remote fails, local remains
 */
function wireRemoteImages(){
  const imgs = document.querySelectorAll("img[data-remote]");
  imgs.forEach((img) => {
    const remote = (img.getAttribute("data-remote") || "").trim();
    if (!remote) return;

    const probe = new Image();
    probe.decoding = "async";
    probe.loading = "eager";
    probe.referrerPolicy = "no-referrer";
    probe.onload = () => { img.src = remote; };
    probe.src = remote;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // year
  const y = $("year");
  if (y) y.textContent = String(new Date().getFullYear());

  // email links
  const email = buildEmail();
  const emailLink = $("emailLink");
  if (emailLink){
    emailLink.textContent = email;
    emailLink.setAttribute("href", directEmailHref());
  }
  const emailBtn = $("emailDirectBtn");
  if (emailBtn) emailBtn.setAttribute("href", directEmailHref());

  // close mobile nav on link click
  document.querySelectorAll("[data-close-nav]").forEach(a => {
    a.addEventListener("click", () => closeMobileNavIfOpen(), { passive:true });
  });

  // remote image swap (optional)
  wireRemoteImages();

  // form submit => static-site endpoint with direct email fallback
  const form = $("quoteForm");
  if (!form) return;
  const submitBtn = form.querySelector('button[type="submit"]');
  const ajaxAction = form.getAttribute("data-ajax-action") || "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");

    if (!form.checkValidity()){
      form.classList.add("was-validated");
      setStatus("Please fix the highlighted fields and try again.");
      return;
    }

    const data = new FormData(form);

    // honeypot
    const hp = (data.get("company_site") || "").toString().trim();
    if (hp.length > 0){
      setStatus("Submission blocked.");
      return;
    }

    if (!ajaxAction){
      setStatus("Form is unavailable right now. Please use the direct email link.");
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    setStatus("Sending your request…");

    try {
      const response = await fetch(ajaxAction, {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        body: data
      });

      if (!response.ok){
        throw new Error(`Request failed with status ${response.status}`);
      }

      form.reset();
      form.classList.remove("was-validated");
      setStatus("Thanks. Your request was sent. Jaime will follow up soon.");
    } catch (err) {
      console.error(err);
      setStatus("The form could not be submitted right now. Please use the direct email button below.");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});
