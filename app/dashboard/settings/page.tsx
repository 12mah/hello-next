import { auth } from '@/auth';
import { fetchUserWithProfile } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
import { ProfileForm, PasswordForm } from '@/app/ui/settings/forms';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect('/login');
  }

  const user = await fetchUserWithProfile(userId);
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="w-full max-w-2xl">
      <h1 className={`${lusitana.className} mb-6 text-2xl`}>个人设置</h1>
      <div className="space-y-6">
        <ProfileForm
          defaults={{
            email: user.email,
            nickname: user.profile?.nickname ?? '',
            phone: user.profile?.phone ?? '',
            bio: user.profile?.bio ?? '',
            avatarUrl: user.profile?.avatarUrl ?? '',
          }}
        />
        <PasswordForm />
      </div>
    </div>
  );
}
