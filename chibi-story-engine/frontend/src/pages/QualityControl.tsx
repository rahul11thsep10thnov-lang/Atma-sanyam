import { useState } from "react";
import { NoStoryboard } from "../components/NoStoryboard";
import { Badge, Button, Card, ErrorNote } from "../components/ui";
import { useAction } from "../hooks/useAsync";
import { useStudio } from "../hooks/useStudio";
import { api } from "../services/api";
import type { QCItem, QCReport } from "../types";

const GROUPS: [string, string, string[]][] = [
  ["Missing assets", "Every character, environment, prop and effect the story names exists and is intact.", ["assets"]],
  ["Character mismatches", "Rigs, expressions, animations and versions fit the characters that use them.", ["characters"]],
  ["Audio problems", "Every line has audio; nothing is silent, clipped or out of date.", ["audio"]],
  ["Timing conflicts", "Clips do not overlap, speech fits its shot, durations sit on the frame grid.", ["timing", "composition"]],
];

export function QualityControl() {
  const { story } = useStudio();
  const [report, setReport] = useState<QCReport | null>(null);
  const [run, busy, error] = useAction();
  if (!story || !story.story_json) return <NoStoryboard />;
  const check = () => run(async () => setReport(await api.post<QCReport>(`/stories/${story.id}/quality-check`)));
  const list = (items: QCItem[]) =>
    items.length === 0 ? (
      <p className="text-sm text-green-800">No problems found.</p>
    ) : (
      <ul className="space-y-1 text-sm">
        {items.map((i, n) => (
          <li key={n} className="flex gap-2">
            <Badge tone={i.severity}>{i.severity}</Badge>
            <span>
              {i.message} {i.where && <code className="text-xs text-stone-500">{i.where}</code>}
            </span>
          </li>
        ))}
      </ul>
    );
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Quality Control</h1>
        <Button disabled={busy} onClick={check}>
          {busy ? "Checking…" : "Run quality check"}
        </Button>
        {report && <span data-testid="qc-verdict"><Badge tone={report.passed ? "pass" : "error"}>{report.passed ? "Automatic checks passed" : `${report.summary.errors} errors`}</Badge></span>}
        {report && <Badge tone={report.ready_to_publish ? "pass" : "pending"}>{report.ready_to_publish ? "Ready to publish" : `${report.summary.awaiting_approval} approvals needed`}</Badge>}
      </div>
      <ErrorNote message={error} />
      {report && (
        <>
          {GROUPS.map(([title, about, categories]) => (
            <Card key={title} title={title}>
              <p className="mb-2 text-xs text-stone-500">{about}</p>
              {list(report.automatic.filter((i) => categories.includes(i.category)))}
            </Card>
          ))}
          <Card title="Render errors and final video validation">
            {report.video ? (
              <>
                <p className="mb-2 text-xs text-stone-500">
                  Checked: {report.video.checks_run.join(", ")}. {report.video.stale && <b className="text-amber-800">The story changed after this video was rendered.</b>}
                </p>
                {list(report.video.automatic)}
              </>
            ) : (
              <p className="text-sm text-stone-600">No final video has been rendered yet.</p>
            )}
          </Card>
          <Card title="Waiting for human approval">
            <p className="mb-2 text-xs text-stone-500">These are judgements, not technical checks: a reviewer approves designs in the libraries and scenes in the Storyboard.</p>
            {report.human_review.length === 0 ? <p className="text-sm text-green-800">Everything is approved.</p> : list(report.human_review)}
          </Card>
        </>
      )}
    </>
  );
}
