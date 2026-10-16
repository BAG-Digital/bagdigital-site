import test from "node:test";
import assert from "node:assert/strict";
import {
  validateInquiryDraft,describeInquiryResult,attachProtectedInquiry
} from "../intake/ui/contact-controller.mjs";

const valid=()=>({
  name:"Synthetic Visitor",email:"qa@example.invalid",business:"",
  interest:"Website or redesign",
  message:"Synthetic inquiry without any customer information.",
  processing_ack:"yes"
});
const UUID="11111111-2222-4333-8444-555555555555";

test("valid draft maps approved public service to backend enum only",()=>{
  const r=validateInquiryDraft(valid());
  assert.equal(r.valid,true);
  assert.equal(r.values.service,"website");
  assert.equal(r.values.email,"qa@example.invalid");
  assert.equal(r.values.processing_ack,"yes");
});

test("all four service choices map exactly",()=>{
  const expected={
    "Website or redesign":"website",
    "Workflow improvement":"workflow-planning",
    "Integration planning":"integration-planning",
    "Technical support":"support"
  };
  for(const [interest,service] of Object.entries(expected)){
    assert.equal(validateInquiryDraft({...valid(),interest}).values.service,service);
  }
});

test("selected source has an unresolved Not sure yet option and never maps silently",()=>{
  // This is a known UX/backend contract mismatch for Indigo/Prism/Rook to
  // resolve before final integration, never an invitation to mislabel users.
  const result=validateInquiryDraft({...valid(),interest:"Not sure yet"});
  assert.equal(result.valid,false);
  assert.match(result.fields.interest,/four listed services/);
});

test("consent, message bounds and header injection fail before submit",()=>{
  for(const draft of [
    {...valid(),processing_ack:""},
    {...valid(),processing_ack:"no"},
    {...valid(),message:"short"},
    {...valid(),message:"X".repeat(2001)},
    {...valid(),name:"A\r\nBcc:other@example.invalid"},
    {...valid(),email:"x@example.invalid\nBcc:y@example.invalid"}
  ])assert.equal(validateInquiryDraft(draft).valid,false);
});

test("unsupported backend response codes never display a fake success",()=>{
  for(const status of [200,201,204,400,403,408,409,413,429,502,503]){
    assert.notEqual(describeInquiryResult(status,"UNKNOWN").kind,"accepted");
  }
  assert.equal(describeInquiryResult(202,"RELAY_ACCEPTED").kind,"accepted");
});

test("ambiguous delivery tells visitor not to automatically resend",()=>{
  for(const code of ["POSSIBLY_SENT","DELIVERY_UNKNOWN"]){
    const r=describeInquiryResult(502,code);
    assert.equal(r.kind,"uncertain");
    assert.match(r.message,/Do not repeatedly submit/);
  }
});

test("incomplete wiring or FormSubmit action is rejected and does not bind",()=>{
  let bound=0;
  const form={dataset:{firstPartyReady:"true"},action:"https://formsubmit.co/old",addEventListener:()=>{bound++}};
  assert.throws(()=>attachProtectedInquiry({
    form,status:{},submit:async()=>{},getChallengeToken:async()=>"",
    requestId:()=>UUID
  }),/not configured/);
  assert.equal(bound,0);
});

function fakeUI(draft=valid()){
  let handler;
  let submitCount=0;
  let focusField;
  const button={disabled:false};
  const form={
    action:"#",dataset:{firstPartyReady:"true"},
    get elements(){return {namedItem:name=>({focus:()=>{focusField=name}})}},
    querySelector:()=>button,
    addEventListener:(name,fn)=>{if(name==="submit")handler=fn},
    removeEventListener:(name,fn)=>{if(handler===fn)handler=null},
    reset(){this.wasReset=true}
  };
  const status={textContent:""};
  const fakeData=new Map(Object.entries(draft));
  const original=globalThis.FormData;
  globalThis.FormData=class { constructor(v){assert.equal(v,form);return fakeData[Symbol.iterator] ? fakeData:undefined;} };
  return {
    form,status,button,
    get submitCount(){return submitCount},
    get focused(){return focusField},
    cleanup(){globalThis.FormData=original},
    async fire(){let prevented=false;await handler({preventDefault(){prevented=true}});assert.equal(prevented,true)},
    bind(overrides={}){
      const controller=attachProtectedInquiry({form,status,
        submit:async()=>{submitCount++;return {status:202,code:"RELAY_ACCEPTED"}},
        getChallengeToken:async()=>"fake-test-token",
        requestId:()=>UUID,...overrides});
      return controller;
    }
  };
}

test("valid synthetic submit attempts exactly one relay call and clears on accepted",async()=>{
  const ui=fakeUI();
  try{
    const unbind=ui.bind();
    await ui.fire();
    assert.equal(ui.submitCount,1);
    assert.equal(ui.form.wasReset,true);
    assert.equal(ui.button.disabled,false);
    assert.match(ui.status.textContent,/email service accepted/);
    unbind();
  }finally{ui.cleanup()}
});

test("invalid consent prevents verifier and sender, focuses the first problem",async()=>{
  const ui=fakeUI({...valid(),processing_ack:""});
  let challenge=0;
  try{
    ui.bind({getChallengeToken:async()=>{challenge++;return "synthetic"}});
    await ui.fire();
    assert.equal(challenge,0);
    assert.equal(ui.submitCount,0);
    assert.equal(ui.focused,"processing_ack");
    assert.match(ui.status.textContent,/acknowledge/);
  }finally{ui.cleanup()}
});

test("uncertain or network failure leaves draft and never retries",async()=>{
  for(const response of [{status:502,code:"DELIVERY_UNKNOWN"},null]){
    const ui=fakeUI();
    let sends=0;
    try{
      ui.bind({submit:async()=>{sends++;if(response===null)throw Error("synthetic");return response}});
      await ui.fire();
      assert.equal(sends,1);
      assert.notEqual(ui.form.wasReset,true);
      assert.equal(ui.button.disabled,false);
      assert.match(ui.status.textContent,/cannot confirm/i);
    }finally{ui.cleanup()}
  }
});

test("bad token prevents even a single send",async()=>{
  const ui=fakeUI();
  try{
    ui.bind({getChallengeToken:async()=>"bad\nchallenge"});
    await ui.fire();
    assert.equal(ui.submitCount,0);
    assert.notEqual(ui.form.wasReset,true);
    assert.match(ui.status.textContent,/unavailable/);
  }finally{ui.cleanup()}
});
