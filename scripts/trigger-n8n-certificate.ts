import { triggerN8nCertificateGeneration } from "../lib/server/n8n-certificate-service.ts";

async function main() {
  const certId = process.argv[2] || "cmqetynt00003tdacficwmjow";
  const email = process.argv[3] || "aditimehra0298@gmail.com";

  const result = await triggerN8nCertificateGeneration({
    certificateId: certId,
    learnerEmail: email,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
