"use client";

// Human-in-the-loop approval.
// CopilotKit useCopilotAction + renderAndWaitForResponse — the agent emits a
// `request_approval` tool call; the frontend renders this card and resolves the
// tool call by calling respond("APPROVED"|"REJECTED"). `respond` is only defined
// while status === "executing" (per react-core types), so we guard with respond?.().
// Per PLAN: model HITL as a tool call the UI fulfills — do NOT invent an INTERRUPT event.
import { useCopilotAction } from "@copilotkit/react-core";

export type ApprovalResult = "APPROVED" | "REJECTED";

/** Presentational approval card — also used statically for demo screenshots. */
export function ApprovalCardView({
  action,
  url,
  disabled = false,
  resolved,
  onApprove,
  onReject,
}: {
  action: string;
  url: string;
  disabled?: boolean;
  resolved?: ApprovalResult;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  return (
    <section className="approval">
      <div className="approvalHead">
        <span className="approvalBadge">Approval needed</span>
        <h3 className="approvalTitle">Confirm browser action</h3>
      </div>
      <p className="approvalAction">{action}</p>
      {url ? <code className="approvalUrl">{url}</code> : null}

      {resolved ? (
        <p className="approvalResolved" data-result={resolved}>
          {resolved === "APPROVED" ? "✓ Approved" : "✕ Rejected"}
        </p>
      ) : (
        <div className="approvalButtons">
          <button
            type="button"
            className="btn btnApprove"
            disabled={disabled}
            onClick={onApprove}
          >
            Approve
          </button>
          <button
            type="button"
            className="btn btnReject"
            disabled={disabled}
            onClick={onReject}
          >
            Reject
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Registers the `request_approval` HITL action with CopilotKit. Renders nothing
 * itself; the card appears inline in the chat when the agent requests approval.
 */
export function ApprovalCard() {
  useCopilotAction({
    name: "request_approval",
    parameters: [
      { name: "action", type: "string" },
      { name: "url", type: "string" },
    ],
    renderAndWaitForResponse: ({ status, args, respond }) => {
      const executing = status === "executing";
      return (
        <ApprovalCardView
          action={args?.action ?? "Perform a browser action"}
          url={args?.url ?? ""}
          disabled={!executing}
          // respond is only defined while executing — guard with optional call.
          onApprove={() => respond?.("APPROVED")}
          onReject={() => respond?.("REJECTED")}
        />
      );
    },
  });
  return null;
}
