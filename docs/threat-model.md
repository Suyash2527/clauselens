# Threat Model
| Threat | Component | Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | API Routes | `enforceSameOrigin` validates requests originate from the allowed frontend domain. |
| **Tampering** | Document Upload | Content-types strictly checked; Gemini endpoints shielded by `sanitiseDocumentText`. |
| **Repudiation** | Logging | Edge routing layer captures IP anomalies natively. |
| **Information Disclosure** | LLM Prompts | `maskPii` scrubs Indian PII (Aadhaar, PAN, IFSC, etc.) before calling Gemini. |
| **Denial of Service** | Extraction | `MAX_BODY_BYTES` (5 MB) enforced before buffering. Upload concurrency bounded. |
| **Elevation of Privilege** | Server Context | Node API routes run with scoped permissions; CSP prevents XSS escalation. |
