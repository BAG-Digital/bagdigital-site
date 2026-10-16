/**
 * Site #26: OFFLINE UX contract for a future first-party inquiry form.
 *
 * It is intentionally NOT imported by the current website. No network, real
 * Turnstile widget, provider secret, endpoint URL, or runtime configuration is
 * present. This is NOT a mitigation of the live FormSubmit form.
 *
 * Before production use: Rook must approve the site/backend service mapping,
 * Indigo must human-test keyboard/VoiceOver/zoom, Prism must approve actual
 * processor disclosure, and Vesper must review the connected exact SHA.
 */
const SERVICES = Object.freeze({
  "Website or redesign": "website",
  "Workflow improvement": "workflow-planning",
  "Integration planning": "integration-planning",
  "Technical support": "support"
});

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const HEADER_CONTROL = /[\r\n\u0000-\u001f\u007f]/u;
const EMAIL = /^[^\s@<>(),;:\[\]\\"]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cp = s => [...s].length;
const bytes = s => new TextEncoder().encode(s).byteLength;
const safe = v => typeof v === "string" ? v : "";

export function validateInquiryDraft(raw) {
  const name = safe(raw?.name).trim().normalize("NFC");
  const email = safe(raw?.email).trim().toLowerCase();
  const business = safe(raw?.business).trim().normalize("NFC");
  const message = safe(raw?.message).trim().normalize("NFC");
  const service = SERVICES[safe(raw?.interest)];
  const fields = {};

  if (cp(name) < 1 || cp(name) > 100 || bytes(name) > 400 ||
      HEADER_CONTROL.test(name)) fields.name = "Enter a name of up to 100 characters.";
  if (!EMAIL.test(email) || email.length > 254 || HEADER_CONTROL.test(email))
    fields.email = "Enter a valid email address.";
  if (cp(business) > 100 || bytes(business) > 400 ||
      HEADER_CONTROL.test(business))
    fields.business = "Business names must be 100 characters or fewer.";
  if (!service) fields.interest =
    "Please choose one of the four listed services before sending.";
  if (cp(message) < 20 || cp(message) > 2000 || bytes(message) > 8000 ||
      CONTROL.test(message))
    fields.message = "Please write between 20 and 2,000 characters.";
  if (raw?.processing_ack !== "yes")
    fields.processing_ack = "Please acknowledge how your inquiry will be processed.";
  return {
    valid: Object.keys(fields).length === 0,
    fields,
    values: {name,email,business,service,message,processing_ack:"yes"}
  };
}

// Only one successful server relay acceptance merits a positive message.
// Uncertain delivery must never prompt an automatic identical resend.
export function describeInquiryResult(status,code) {
  if (status === 202 && code === "RELAY_ACCEPTED") return {
    kind:"accepted",
    message:"Our email service accepted your inquiry, but inbox delivery is not guaranteed. You can contact us directly if you don't receive a reply."
  };
  if (status === 409 || status === 502 || code === "POSSIBLY_SENT" ||
      code === "DELIVERY_UNKNOWN") return {
    kind:"uncertain",
    message:"We cannot confirm whether your inquiry was sent. Please email BAGDigital directly if it is urgent. Do not repeatedly submit the same message."
  };
  if (status === 408) return {kind:"retry",message:
    "The request timed out. Please verify your connection and start a fresh challenge before attempting again."};
  if (status === 413) return {kind:"invalid",message:
    "Your inquiry is too long. Please shorten it and try again."};
  if (status === 400 || status === 415) return {kind:"invalid",message:
    "Check your inquiry details and try again."};
  if (status === 403) return {kind:"retry",message:
    "Verification was rejected. Please start a fresh challenge before attempting again."};
  if (status === 429) return {kind:"blocked",message:
    "Too many inquiries have been attempted. Please use our direct email address instead."};
  return {kind:"unavailable",message:
    "Our inquiry form is currently unavailable. Please contact us by email."};
}

/**
 * Explicitly wired in a FUTURE independently reviewed production UI only.
 * The caller provides a reviewed, fixed-endpoint submit function and a real
 * Turnstile token getter/resetter. No arbitrary API URL is accepted here.
 */
export function attachProtectedInquiry({
  form,status,submit,getChallengeToken,resetChallenge,requestId
}) {
  if (!form || form.dataset?.firstPartyReady !== "true" ||
      /formsubmit\.co/i.test(form.action || "") ||
      typeof submit !== "function" ||
      typeof getChallengeToken !== "function" ||
      typeof requestId !== "function" || !status) {
    throw new Error("Protected inquiry is not configured; leave fallback contact visible.");
  }
  let busy = false;
  const handler = async event => {
    event.preventDefault();
    if (busy) return;
    const draft = Object.fromEntries(new FormData(form));
    const check = validateInquiryDraft(draft);
    if (!check.valid) {
      const fieldName = Object.keys(check.fields)[0];
      status.textContent = check.fields[fieldName];
      const input = form.elements.namedItem(fieldName);
      if (input?.focus) input.focus();
      return;
    }
    busy = true;
    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    status.textContent = "Checking and sending your inquiry…";
    try {
      const token = await getChallengeToken();
      const id = requestId();
      if (typeof token !== "string" || token.length < 1 || token.length > 2048 ||
          !/^[\x21-\x7e]+$/.test(token) || !UUID4.test(id)) {
        status.textContent = "Verification is unavailable. Please email us directly.";
        return;
      }
      // One delivery attempt. NO silent retries or fallback provider POSTs.
      const result = await submit({
        ...check.values,challenge_token:token,request_id:id
      });
      const outcome = describeInquiryResult(result?.status,result?.code);
      status.textContent = outcome.message;
      if (outcome.kind === "accepted") form.reset();
    } catch {
      status.textContent = "We cannot confirm delivery. Please email BAGDigital directly if urgent. Do not resubmit without checking.";
    } finally {
      busy = false;
      if (button) button.disabled = false;
      try { await resetChallenge?.() } catch {} // Does not rewrite outcome.
    }
  };
  form.addEventListener("submit",handler);
  return () => form.removeEventListener("submit",handler);
}
