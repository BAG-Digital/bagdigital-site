/**
 * Synthetic customer workspace controller.
 * No network, authentication, storage, provider data or executable approvals.
 * Rook: the future production adapter belongs in authenticated BAGDigital Core.
 */
export const VIEW_IDS = Object.freeze(['home','connections','approvals','activity']);
export const CONNECTION_STATUSES = Object.freeze(['not_connected','pending_approval','connecting','connected','needs_attention','disconnected']);
export function normalizeConnection(input) {
  if (!input || typeof input !== 'object') throw new TypeError('Connection must be an object');
  if (!CONNECTION_STATUSES.includes(input.status)) throw new RangeError('Unknown connection status');
  if (input.status === 'connected' && (typeof input.verifiedAt !== 'string' || !Number.isFinite(Date.parse(input.verifiedAt)) || !Array.isArray(input.allowedCapabilities))) {
    throw new Error('Connected status requires verifiedAt and allowedCapabilities');
  }
  return Object.freeze({
    providerDisplayName: String(input.providerDisplayName || 'Unknown provider'),
    status: input.status,
    verifiedAt: input.verifiedAt ?? null,
    allowedCapabilities: Object.freeze([...(input.allowedCapabilities ?? [])])
  });
}
export function syntheticWorkspace() {
  return Object.freeze({
    connections: Object.freeze([
      normalizeConnection({providerDisplayName:'Housecall Pro',status:'not_connected'}),
      normalizeConnection({providerDisplayName:'Google Workspace',status:'not_connected'})
    ]),
    pendingApprovalsCount:0,
    activeWorkflowsCount:0,
    recentActivity:Object.freeze([])
  });
}
/**
 * Populate only from a validated, explicitly supplied view model.
 * No automatic connection to any provider or production API.
 */
export function renderWorkspaceSummary(root, workspace) {
  if (!workspace || !Array.isArray(workspace.connections) ||
      !Number.isSafeInteger(workspace.pendingApprovalsCount) || workspace.pendingApprovalsCount < 0 ||
      !Number.isSafeInteger(workspace.activeWorkflowsCount) || workspace.activeWorkflowsCount < 0) {
    throw new TypeError('Invalid workspace summary');
  }
  const count = root.querySelector('[data-metric="connections"]');
  const approvals = root.querySelector('[data-metric="approvals"]');
  const workflows = root.querySelector('[data-metric="workflows"]');
  if (count) count.textContent = String(workspace.connections.filter(c => c.status === 'connected').length);
  if (approvals) approvals.textContent = String(workspace.pendingApprovalsCount);
  if (workflows) workflows.textContent = String(workspace.activeWorkflowsCount);
  return true;
}
export function initCustomerNavigation(root=document) {
  const tabs=[...root.querySelectorAll('[data-view]')];
  const views=[...root.querySelectorAll('.view')];
  const main=root.querySelector('main');
  function show(id,{focus=false}={}) {
    if(!VIEW_IDS.includes(id)) return false;
    views.forEach(view=>{
      const active=view.id===id;
      view.hidden=!active;
      view.classList.toggle('hidden',!active);
    });
    tabs.forEach(tab=>{
      const active=tab.dataset.view===id;
      if(active) tab.setAttribute('aria-current','page');
      else tab.removeAttribute('aria-current');
    });
    if(focus){
      const heading=root.getElementById(id)?.querySelector('h1');
      if(heading){heading.setAttribute('tabindex','-1');heading.focus();}
    }
    return true;
  }
  tabs.forEach(tab=>tab.addEventListener('click',()=>show(tab.dataset.view,{focus:true})));
  root.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.go,{focus:true})));
  show('home');
  return {show};
}
