import { ExternalLink } from "lucide-react";
import type { QuestionReference } from "@/modules/practice/types";

const categories = {
  regulatory_requirement: "Regulatory requirement",
  consensus_standard: "Consensus standard",
  professional_guidance: "Professional guidance",
  supplemental_resource: "Supplemental learning resource",
};

/** Reference evidence appears with teaching feedback, never as an exam answer hint. */
export function QuestionReferences({
  references,
  instructional,
}: {
  references: QuestionReference[];
  instructional: boolean;
}) {
  return (
    <details className="question-reference-panel" open>
      <summary>Technical references and verification</summary>
      <ul>
        {references.map((reference, index) => (
          <li key={`${reference.url}:${reference.title}:${index}`}>
            <strong>
              {reference.classification
                ? categories[reference.classification]
                : "Source category pending review"}
            </strong>
            {reference.url.startsWith("https://") ? (
              <a href={reference.url} target="_blank" rel="noreferrer">
                {reference.title}
                <ExternalLink size={14} />
              </a>
            ) : (
              <p>{reference.title} · Source link unavailable</p>
            )}
            <p>
              {reference.edition
                ? `Edition/version: ${reference.edition}`
                : "Publication edition requires verification."}
            </p>
            <p>
              {reference.locator
                ? `Source locator: ${reference.locator}`
                : "Exact supporting section has not been verified."}
            </p>
            <small>
              {instructional && reference.verifiedAt
                ? `Source-verification evidence recorded ${reference.verifiedAt.slice(0, 10)}. Technical approval is a separate review.`
                : "Candidate reference only. Its inclusion does not verify this answer or mean the source text has been examined."}
            </small>
          </li>
        ))}
      </ul>
      <p className="fine-print">
        A regulation has a specific jurisdiction and scope. A consensus standard
        or professional recommendation is not automatically a legally applicable
        requirement. A bibliography listing alone does not establish support for
        an answer.
      </p>
    </details>
  );
}
