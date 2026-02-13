import { TasksInboxFrame } from "../../../components/tasks/TasksInboxFrame";
import { ChronologicalTaskFeed } from "../../../components/tasks/ChronologicalTaskFeed";

export default function TasksPage() {
  return (
    <div className="relative">
      <TasksInboxFrame />
      <ChronologicalTaskFeed />
    </div>
  );
}
