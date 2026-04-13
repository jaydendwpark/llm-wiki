import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { TaskList } from "@/components/tasks/TaskList";

export const revalidate = 0;

export default async function TasksPage() {
  const t = await getT();
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-wiki-text mb-1">{t("tasks.title")}</h1>
        <p className="text-wiki-muted text-sm">{t("tasks.desc")}</p>
      </div>

      {!tasks || tasks.length === 0 ? (
        <div className="text-center py-20">
          <CheckSquare className="w-12 h-12 mx-auto mb-4 text-wiki-muted" />
          <p className="text-wiki-text font-medium mb-2">{t("tasks.empty")}</p>
          <p className="text-wiki-muted text-sm mb-6">{t("tasks.emptyDesc")}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-wiki-accent hover:bg-wiki-accent/80 text-white px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {t("tasks.goHome")}
          </Link>
        </div>
      ) : (
        <TaskList initialTasks={tasks} />
      )}
    </div>
  );
}
