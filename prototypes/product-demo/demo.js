"use strict";

// This file is a deterministic, browser-only illustration. It never reads user
// information, contacts a provider, or sends/stores messages.
const EXAMPLES = Object.freeze({
  service: Object.freeze({
    source: "Website inquiry · simulated",
    business: "Harbor Service Co. · fictional",
    contact: "Alex · fictional",
    type: "Service appointment",
    message: "Hi! We need someone to take a look at a leak near our skylight. Can you tell us how scheduling works?",
    greeting: "Hi Alex,",
    reply: "Thanks for reaching out about the skylight leak. We can review the request and help arrange the next step. Could you share a couple of times that work for you and a photo of the area? A member of our team will confirm the details before anything is scheduled.",
    organized: "The request is grouped with the contact and appointment details. No calendar or customer record was changed.",
    reviewed: "This example reply has been marked approved inside the demo only. No email, text, or customer message was sent."
  }),
  marketing: Object.freeze({
    source: "Social media message · simulated",
    business: "Harbor Creative Co. · fictional",
    contact: "Sam · fictional",
    type: "Video and promotion inquiry",
    message: "Hey! Our new café is opening soon. We want a launch video and maybe some help promoting it. What do you need to know before you can give us options?",
    greeting: "Hi Sam,",
    reply: "Thanks for telling us about your café launch! To explore the right video approach, could you share your opening date, approximate budget, and a couple of videos you like? We'd also love to know where you'd like the finished video promoted. Once we've reviewed those details, a team member can suggest appropriate production and promotion options.",
    organized: "The initial request is organized around timing, budget, inspiration, and promotion goals. No social platform has been connected.",
    reviewed: "This draft has been marked approved inside the demo only. No social media reply or proposal was sent."
  })
});

const PHASES = Object.freeze([
  {
    eyebrow: "STEP 1 OF 4",
    title: "A request comes in.",
    description: "The original message stays visible. No reply has been prepared or sent.",
    action: "Organize this request"
  },
  {
    eyebrow: "STEP 2 OF 4",
    title: "Details are organized.",
    description: "",
    action: "Prepare an example reply"
  },
  {
    eyebrow: "STEP 3 OF 4",
    title: "A draft is ready for review.",
    description: "The reply is a fictional, prewritten example. It has not been approved or sent.",
    action: "Approve in this demo"
  },
  {
    eyebrow: "STEP 4 OF 4",
    title: "Reviewed in the demo.",
    description: "",
    action: "Approved here — nothing sent"
  }
]);

const el = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  const buttons = {
    service: el("serviceBtn"),
    marketing: el("marketingBtn")
  };
  const advance = el("advanceBtn");
  const reset = el("resetBtn");

  let selectedScenario = "service";
  let phase = 0;

  function render() {
    const example = EXAMPLES[selectedScenario];
    const current = PHASES[phase];

    for (const [key, button] of Object.entries(buttons)) {
      const selected = key === selectedScenario;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }

    el("sourceLabel").textContent = example.source;
    el("businessName").textContent = example.business;
    el("contactName").textContent = example.contact;
    el("requestType").textContent = example.type;
    el("incomingMessage").textContent = example.message;

    document.querySelectorAll("[data-step]").forEach((step, index) => {
      step.classList.toggle("current", index === phase);
      step.classList.toggle("completed", index < phase);
      step.classList.toggle("waiting", index > phase);
      if (index === phase) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");

      const status = step.querySelector(".step-status");
      if (status) {
        status.textContent = index < phase ? "DONE" : index === phase ? "CURRENT" : "WAITING";
      }
    });

    el("stepEyebrow").textContent = current.eyebrow;
    el("stepTitle").textContent = current.title;
    el("stepDescription").textContent =
      phase === 1 ? example.organized : phase === 3 ? example.reviewed : current.description;

    if (phase < 2) {
      el("draftGreeting").textContent = "Not ready yet";
      el("draftContent").textContent = "Organize the request and prepare a draft to see how the response could look.";
      el("draftIndicator").textContent = "NOT PREPARED";
      el("approvalPill").textContent = "NOT REVIEWED";
      el("reviewReminder").textContent = "Nothing is sent automatically. The example reply is waiting for a person to review it.";
    } else {
      el("draftGreeting").textContent = example.greeting;
      el("draftContent").textContent = example.reply;
      el("draftIndicator").textContent = phase === 3 ? "DEMO REVIEWED" : "DRAFT ONLY";
      el("approvalPill").textContent = phase === 3 ? "APPROVED IN DEMO" : "AWAITING REVIEW";
      el("reviewReminder").textContent = phase === 3
        ? "Approved in this simulation. No message was sent and no external account was changed."
        : "This sample message has not been sent. A person must approve it before any real-world action.";
    }

    el("approvalPill").classList.toggle("approved", phase === 3);
    advance.textContent = current.action + (phase === 3 ? "" : " →");
    advance.disabled = phase === 3;
    advance.setAttribute("aria-disabled", String(phase === 3));
  }

  for (const [key, button] of Object.entries(buttons)) {
    button.addEventListener("click", () => {
      selectedScenario = key;
      phase = 0;
      render();
    });
  }

  advance.addEventListener("click", () => {
    if (phase >= PHASES.length - 1) return;
    phase += 1;
    render();
  });

  reset.addEventListener("click", () => {
    phase = 0;
    render();
    advance.focus();
  });

  render();
});
