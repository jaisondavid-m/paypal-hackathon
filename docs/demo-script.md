# ProofRail AI — 2:45 Hackathon Demo Video Script

**Target Duration:** 2 minutes, 45 seconds (165 seconds)  
**Tone:** Confident, crisp, product-led  
**Core Thesis:** *Payment platforms move money. ProofRail preserves the story behind it.*

---

## 🎬 Act 1: The Problem (0:00 – 0:20 | 20s)

**[Visual: Split-screen of messy WhatsApp messages, invoices, and a PayPal dispute notification email showing a $2,000 reversal.]**

**VOICEOVER:**  
> "A freelance web developer completes a $2,000 client project. The payment is received on PayPal. Three weeks later—disaster.  
> The client files a 'Service Not Received' dispute.  
> The developer scrambles: WhatsApp chats, deployment URLs, email approvals, screenshots—scattered across five apps.  
> Payment platforms remember the money, but merchants lose because they cannot prove the transaction.  
> That is why we built **ProofRail AI**."

---

## 📋 Act 2: Structured Agreement & Tokenized Approval (0:20 – 0:50 | 30s)

**[Visual: ProofRail Landing Page -> Click '⚡ Judge Mode' or 'Create Transaction'. Paste client's raw WhatsApp brief into AI extractor.]**

**VOICEOVER:**  
> "ProofRail starts *before* money changes hands.  
> The merchant pastes the raw client requirements. In seconds, Gemini AI analyzes the scope, structured deliverables, price, and milestone acceptance criteria.  
> Notice our Agreement Readiness Engine immediately flags 3 critical ambiguities—missing revision policy, hosting responsibility, and refund terms.  
> The merchant clicks **'Generate Customer Approval Link'**.  
> The client opens the mobile-responsive sign-off link, verifies deliverables, and accepts with a single tap. ProofRail cryptographically timestamps the binding scope."

---

## 💳 Act 3: Server-Derived PayPal Sandbox Capture (0:50 – 1:20 | 30s)

**[Visual: Switch to 'PayPal Payment' tab. Show the PayPal Sandbox checkout trigger.]**

**VOICEOVER:**  
> "Next: payment. Crucially, ProofRail enforces strict financial safety—**AI never moves or touches money**.  
> The order amount and currency are read exclusively from the database-approved agreement row. Our backend guard rejects any client manipulation.  
> We execute the server-side PayPal REST API v2 order creation and capture in the PayPal Sandbox.  
> Instantly, PayPal Order ID and Capture ID are recorded into an immutable audit trail."

---

## 🛡️ Act 4: The USP — Pre-Dispute Health Check & AG Grid (1:20 – 1:50 | 30s)

**[Visual: Dashboard shows 'Portfolio Health' widget (Score: 45/100, RED 'High Risk'). Open transaction detail. Banner displays 'High risk — missing critical proof'. Click 'Fix This Gap' -> uploads deployment URL and screenshot -> Health banner turns GREEN 'Dispute-ready' at 94/100. Switch to AG Grid Community table.]**

**VOICEOVER:**  
> "Here is our unique differentiator: **The Pre-Dispute Health Check**.  
> While traditional tools panic *after* a dispute arrives, ProofRail acts *continuously*.  
> Before delivery, the Health Banner is RED—alerting the merchant that PayPal Seller Protection requires verifiable delivery proof.  
> Watch this: I click **'Fix This Gap'**. It deep-links straight to our Evidence Vault. I attach the live staging URL and production screenshots.  
> The AI re-scans: our health score surges from 45 to **94/100—Dispute-Ready!**  
> All cryptographic evidence and SHA-256 hashes are rendered in enterprise-grade **AG Grid Community**, supporting one-click CSV export and instant filtering."

---

## ⚖️ Act 5: Real PayPal Disputes API & Evidence Submission (1:50 – 2:30 | 40s)

**[Visual: Navigate to Dispute Workspace. Show incoming dispute from PayPal Sandbox API (`/v1/customer/disputes`) or verified webhook event. AI Evidence Dossier automatically maps SHA-256 artifacts to PayPal requirements. Click 'Submit Evidence to PayPal API' -> Live HTTP 200 response preview.]**

**VOICEOVER:**  
> "Now, what if the client disputes anyway?  
> Real PayPal dispute events arrive via our HMAC-verified, idempotent webhook handler.  
> In our **Dispute Workspace**, ProofRail calls the live PayPal Disputes REST API. It fetches the exact dispute reason, status, and required evidence types.  
> Our AI compiles a source-grounded, attorney-grade defense dossier: agreed scope, customer approval timestamp, PayPal capture ID, deployment logs, and SHA-256 evidence hashes.  
> The merchant reviews the mapped artifacts and clicks **'Submit to PayPal'**.  
> The evidence is transmitted directly to PayPal's `provide-evidence` endpoint with live API confirmation."

---

## 🏆 Act 6: Close & Vision (2:30 – 2:45 | 15s)

**[Visual: Return to the sleek ProofRail dashboard. Show 'PayPal Sandbox · AI-assisted · Human-approved' badge.]**

**VOICEOVER:**  
> "Payment platforms move money.  
> **ProofRail preserves the story behind it.**  
> Pre-dispute health checks, cryptographic proof, and real PayPal dispute resolution—protecting freelancers and merchants worldwide.  
> Thank you."

---

