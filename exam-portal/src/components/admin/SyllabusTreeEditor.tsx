import type { SyllabusWithTree } from "@/lib/services/syllabi";

type Actions = {
  addPaper: (formData: FormData) => Promise<void>;
  deletePaper: (formData: FormData) => Promise<void>;
  addSubject: (formData: FormData) => Promise<void>;
  deleteSubject: (formData: FormData) => Promise<void>;
  addTopic: (formData: FormData) => Promise<void>;
  deleteTopic: (formData: FormData) => Promise<void>;
};

const smallInputClass =
  "rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

const addButtonClass =
  "rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800";

const deleteButtonClass =
  "text-xs font-medium text-red-600 hover:underline";

/**
 * Structured syllabus editor (Section 13): Paper → Subject → Topic, each
 * level its own small `<form>` posting to a dedicated Server Action —
 * add/delete work with a full page redirect, no client JS required,
 * consistent with the rest of the admin console.
 */
export function SyllabusTreeEditor({
  syllabus,
  actions,
}: {
  syllabus: SyllabusWithTree;
  actions: Actions;
}) {
  return (
    <div className="flex flex-col gap-4">
      {syllabus.papers.map((paper) => (
        <div key={paper.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{paper.name}</h3>
            <form action={actions.deletePaper}>
              <input type="hidden" name="paperId" value={paper.id} />
              <input type="hidden" name="syllabusId" value={syllabus.id} />
              <button type="submit" className={deleteButtonClass}>
                Remove paper
              </button>
            </form>
          </div>

          <div className="mt-3 flex flex-col gap-3 border-l-2 border-slate-100 pl-4">
            {paper.subjects.map((subject) => (
              <div key={subject.id}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-slate-800">
                    {subject.name}
                  </h4>
                  <form action={actions.deleteSubject}>
                    <input type="hidden" name="subjectId" value={subject.id} />
                    <input type="hidden" name="syllabusId" value={syllabus.id} />
                    <button type="submit" className={deleteButtonClass}>
                      Remove subject
                    </button>
                  </form>
                </div>

                <ul className="mt-1 flex flex-col gap-1 pl-4">
                  {subject.topics.map((topic) => (
                    <li
                      key={topic.id}
                      className="flex items-start justify-between gap-2 text-sm text-slate-700"
                    >
                      <span>
                        {topic.name}
                        {topic.subtopics.length > 0 ? (
                          <span className="text-slate-400">
                            {" "}
                            — {topic.subtopics.join(", ")}
                          </span>
                        ) : null}
                      </span>
                      <form action={actions.deleteTopic}>
                        <input type="hidden" name="topicId" value={topic.id} />
                        <input type="hidden" name="syllabusId" value={syllabus.id} />
                        <button type="submit" className={deleteButtonClass}>
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>

                <form
                  action={actions.addTopic}
                  className="mt-2 flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="subjectId" value={subject.id} />
                  <input type="hidden" name="syllabusId" value={syllabus.id} />
                  <input
                    name="name"
                    placeholder="Topic name"
                    required
                    className={smallInputClass}
                  />
                  <input
                    name="subtopics"
                    placeholder="Subtopics, comma-separated (optional)"
                    className={`${smallInputClass} flex-1 min-w-[12rem]`}
                  />
                  <button type="submit" className={addButtonClass}>
                    Add topic
                  </button>
                </form>
              </div>
            ))}

            <form action={actions.addSubject} className="flex items-center gap-2">
              <input type="hidden" name="paperId" value={paper.id} />
              <input type="hidden" name="syllabusId" value={syllabus.id} />
              <input
                name="name"
                placeholder="Subject name"
                required
                className={smallInputClass}
              />
              <button type="submit" className={addButtonClass}>
                Add subject
              </button>
            </form>
          </div>
        </div>
      ))}

      <form
        action={actions.addPaper}
        className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 p-4"
      >
        <input type="hidden" name="syllabusId" value={syllabus.id} />
        <input
          name="name"
          placeholder="Paper name (e.g. Paper 1)"
          required
          className={smallInputClass}
        />
        <button type="submit" className={addButtonClass}>
          Add paper
        </button>
      </form>
    </div>
  );
}
