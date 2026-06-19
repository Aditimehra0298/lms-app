/** Re-export — certificates use direct generator API, not n8n. */
export {
  generateCertificateViaApi,
  generateCertificateFromTemplate,
  sendCertificateTemplateToN8n,
  type CertificateGeneratorSentSummary,
  type N8nCertificateSentSummary,
  type TriggerCertificateResult,
} from "@/lib/certificate-generator-client";
