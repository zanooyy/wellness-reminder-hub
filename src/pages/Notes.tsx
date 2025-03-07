
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { NotesList } from "@/components/notes/NotesList";

const Notes = () => {
  return (
    <DashboardLayout>
      <NotesList />
    </DashboardLayout>
  );
};

export default Notes;
