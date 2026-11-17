import { Link } from "react-router-dom";
import { Empty } from "./ui";

export function NoStoryboard() {
  return (
    <Empty>
      This story has no storyboard yet. Go to <Link className="font-medium text-brand underline" to="/story">Story Studio</Link> and choose “Generate storyboard”.
    </Empty>
  );
}
