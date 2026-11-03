"use strict";

// UI-only onboarding design proof. No forms, credentials, network requests,
// persistence, subscriptions or real business-account creation.
document.addEventListener("DOMContentLoaded", () => {
  const screens = ["screenAccount", "screenBusiness", "screenPriorities", "screenWorkspace"];
  const priorityDescriptions = {
    followup: "Follow-up tracking",
    daily: "Daily work overview",
    admin: "Less manual data entry"
  };
  let step = 0;
  let businessMode = "create";
  let priority = "followup";

  const get = (id) => document.getElementById(id);
  const next = get("continueBtn");
  const back = get("previousBtn");

  function setPressed(buttons, attribute, selected) {
    document.querySelectorAll(buttons).forEach((button) => {
      const active = button.dataset[attribute] === selected;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function render() {
    screens.forEach((id, index) => {
      const active = index === step;
      const panel = get(id);
      panel.classList.toggle("hidden", !active);
      panel.hidden = !active;
      panel.setAttribute("aria-hidden", String(!active));
    });

    document.querySelectorAll("[data-nav-step]").forEach((item, index) => {
      item.classList.toggle("active", index === step);
      item.classList.toggle("done", index < step);
      const status = item.querySelector(".step-state");
      status.textContent = index < step ? "DONE" : index === step ? "CURRENT" : "LATER";
      if (index === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });

    get("stepCount").textContent = "STEP " + (step + 1) + " / 4";
    get("completionLabel").textContent = "Preview step " + (step + 1) + " of 4";
    get("progressFill").style.width = String((step + 1) * 25) + "%";

    back.disabled = step === 0;
    next.textContent = step === 3 ? "Restart preview ↺" : "Preview next step →";

    setPressed("[data-business]", "business", businessMode);
    setPressed("[data-priority]", "priority", priority);

    const joining = businessMode === "join";
    get("businessPreviewTitle").textContent = joining
      ? "Example Team Invitation" : "Example Service Co.";
    get("businessPreviewText").textContent = joining
      ? "A fictional invitation would need to be verified before you join a team. No invite is accepted here."
      : "A sample business workspace. No real organization will be created.";
    get("workspaceBusiness").textContent = joining
      ? "Example Team Co." : "Example Service Co.";
    get("selectedPriorityLabel").textContent = priorityDescriptions[priority];
  }

  function switchTo(stepIndex) {
    step = stepIndex;
    render();
    const currentScreen = get(screens[step]);
    const title = currentScreen.querySelector("h2");
    if (title) {
      title.setAttribute("tabindex", "-1");
      title.focus({ preventScroll: true });
    }
  }

  next.addEventListener("click", () => {
    if (step === 3) {
      businessMode = "create";
      priority = "followup";
      switchTo(0);
    } else {
      switchTo(step + 1);
    }
  });

  back.addEventListener("click", () => {
    if (step > 0) switchTo(step - 1);
  });

  document.querySelectorAll("[data-business]").forEach((button) => {
    button.addEventListener("click", () => {
      businessMode = button.dataset.business;
      render();
    });
  });

  document.querySelectorAll("[data-priority]").forEach((button) => {
    button.addEventListener("click", () => {
      priority = button.dataset.priority;
      render();
    });
  });

  render();
});
