# Temporary FormSubmit preflight — Site #7 / PR #5

**Status: source preparation only / NOT published / RT-WEB-01 OPEN.**
Rook owns engineering; Vesper independently reviews source and provider evidence; Indigo checks human accessibility; Prism checks privacy and claims; founder decides merge and publication.

## Authorized path and evidence

Founder selected the existing FormSubmit fix on October 17 as the temporary path; the custom Cloudflare marketing-intake project is parked. [Site #7 owner decision](https://github.com/BAG-Digital/bagdigital-site/issues/7#issuecomment-6234754767). Existing PR #5 was already reviewed by [Vesper](https://github.com/BAG-Digital/bagdigital-site/pull/5#pullrequestreview-5456119130) at OLD exact SHA 6bc5c87e6fb52a2a46534886db599d5eb8d612e4, PASS WITH CONDITIONS for source ONLY. Subsequent changes on this same branch require a NEW exact-SHA Vesper review. The live medium Site #7 finding is not independently closed.

Candidate uses normal native browser POST, FormSubmit-supported _honey field, no _captcha=false flag, native required/email validation, limited fields and first-party privacy notice with third-party processing and potential CAPTCHA. The HTML now has explicit static mailto links usable even if JavaScript fails; site script and original form route are otherwise unchanged. This branch is based on the current old-site main, NOT the separate unmerged Field Notes redesign.

[Current FormSubmit documentation](https://formsubmit.co/documentation) describes default CAPTCHA, reserved _honey (filled means provider may silently discard), optional form-supplied _captcha=false, and a documented 30-day submission archive. That documentation does NOT independently prove enforcement for the BAGDigital recipient when third parties send requests directly.

## Repeatable safe checks

- Run: node --test tests/contact-form-contract.test.mjs (five static source tests including scriptless mailto).
- Run: node tests/formsubmit-browser-smoke.mjs (headless Chromium, ephemeral 127.0.0.1 server).
- Chromium NEVER clicks Submit; vendor destination URLs are also blocked at the network layer. It checks actual rendered form and native validation with scripts disabled, privacy content, static email fallback, four widths and JS re-enable. Thus zero FormSubmit HTTP requests or mail.
- A new GitHub Actions job runs these exact local tests with SHA-pinned read-only checkout and Node 22. Report exact latest HEAD and run ID only after successful job logs are inspected.

## Provider/manual observations remain missing

The founder previously allowed **up to THREE** total benign manually initiated synthetic provider interactions, once per approved case, with zero retries and NO automation, spam/bypass probes, sensitive records, real customer data, or unapproved vendor changes. See [founder bounded test decision](https://github.com/BAG-Digital/bagdigital-site/issues/7#issuecomment-6202766146). No such live test was executed in this work.

| Allowed scenario | Evidence needed | Status |
| --- | --- | --- |
| One normal fake-data browser submission | CAPTCHA/verification/return observed, redacted timestamp and one inbox receipt if any | NOT EXECUTED here |
| One provider-supported _honey-filled fake submission | Redacted result and recipient observation of suppression; thank-you UI alone is insufficient | NOT EXECUTED here |
| Earlier proposal: omit processing_ack | This particular PR #5 has NO processing_ack field; test would not prove provider consent enforcement. Ask Vesper to disposition relevance before using the third possible interaction | NOT EXECUTED here |

Do NOT attempt a caller-supplied _captcha=false bypass/direct-POST tampering probe under the current bounded approval. Stop on unexpected provider warnings, activation, redirects or errors. Two historical founder-reported positive localhost submissions do not replace this missing anti-spam negative evidence. No account-wide CAPTCHA/anti-abuse or direct-post protection is verified merely by HTML source.

## Outstanding release requirements

- Vesper: review latest SHA/source and actual CI logs; independently evaluate real provider anti-abuse/consent evidence and residual direct-POST risk; Site #7 stays OPEN until formal disposition.
- Indigo: manual keyboard/VoiceOver/NVDA/200% zoom and actual FormSubmit challenge/return/error checks. Local Chromium does not certify assistive tech.
- Prism: first-party privacy/retention/processor copy and accurate customer-facing claims at latest version.
- Keel: actual public host behavior and emergency revert after future authorized release; no live host change now.
- Founder: separately authorize exact code merge and publication only after the independent release gate. If vendor guarantees cannot be verified, HOLD or select a new independently reviewed alternative.

No provider request, outbound email, real credentials/customer info, DNS change, cloud setup, spending, source merge or public publication performed by this preflight.
