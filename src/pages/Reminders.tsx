
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { MedicineReminder } from "@/components/reminders/MedicineReminder";

const Reminders = () => {
  return (
    <DashboardLayout>
      <MedicineReminder />
    </DashboardLayout>
  );
};

export default Reminders;
