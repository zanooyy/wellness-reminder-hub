
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ProfileForm } from "@/components/profile/ProfileForm";

const Profile = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal information and health details
          </p>
        </div>
        
        <ProfileForm />
      </div>
    </DashboardLayout>
  );
};

export default Profile;
