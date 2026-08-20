'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn, auth } from '@/auth';
import { AuthError } from 'next-auth';
import bcrypt from 'bcrypt';
import { prisma } from '@/app/lib/prisma';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string().min(1, '请选择客户'),
  amount: z.coerce
    .number({ invalid_type_error: '请输入有效金额' })
    .gt(0, '金额必须大于 0'),
  status: z.enum(['pending', 'paid'], {
    errorMap: () => ({ message: '请选择发票状态' }),
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export type InvoiceFormState = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export async function createInvoice(
  prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const validated = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: '表单填写有误，请检查后重试。',
    };
  }

  const { customerId, amount, status } = validated.data;
  const amountInCents = Math.round(amount * 100);
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  try {
    await prisma.invoice.create({
      data: {
        customerId,
        amount: amountInCents,
        status,
        date,
      },
    });
  } catch (error) {
    console.error(error);
    return { message: '数据库错误：创建发票失败。' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(
  id: string,
  prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const validated = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: '表单填写有误，请检查后重试。',
    };
  }

  const { customerId, amount, status } = validated.data;
  const amountInCents = Math.round(amount * 100);

  try {
    await prisma.invoice.update({
      where: { id },
      data: {
        customerId,
        amount: amountInCents,
        status,
      },
    });
  } catch (error) {
    console.error(error);
    return { message: '数据库错误：更新发票失败。' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  await prisma.invoice.delete({ where: { id } });
  revalidatePath('/dashboard/invoices');
}

// —— 一对一资料 / 改密码（第五步）——

const ProfileSchema = z.object({
  nickname: z.string().max(255).optional(),
  phone: z.string().max(32).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().max(255).optional(),
});

export type ProfileFormState = {
  errors?: {
    nickname?: string[];
    phone?: string[];
    bio?: string[];
    avatarUrl?: string[];
  };
  message?: string | null;
};

/** 保存个人资料 → 写 user_profiles（一对一 upsert） */
export async function updateProfile(
  prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { message: '请先登录。' };
  }

  const validated = ProfileSchema.safeParse({
    nickname: formData.get('nickname') || undefined,
    phone: formData.get('phone') || undefined,
    bio: formData.get('bio') || undefined,
    avatarUrl: formData.get('avatarUrl') || undefined,
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: '表单填写有误，请检查后重试。',
    };
  }

  const data = {
    nickname: validated.data.nickname ?? null,
    phone: validated.data.phone ?? null,
    bio: validated.data.bio ?? null,
    avatarUrl: validated.data.avatarUrl ?? null,
  };

  try {
    await prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  } catch (error) {
    console.error(error);
    return { message: '数据库错误：保存资料失败。' };
  }

  revalidatePath('/dashboard/settings');
  return { message: '资料已保存。' };
}

const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '请输入当前密码'),
    newPassword: z.string().min(6, '新密码至少 6 位'),
    confirmPassword: z.string().min(1, '请确认新密码'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: '两次输入的新密码不一致',
    path: ['confirmPassword'],
  });

export type PasswordFormState = {
  errors?: {
    currentPassword?: string[];
    newPassword?: string[];
    confirmPassword?: string[];
  };
  message?: string | null;
};

/** 改密码 → 只更新 users.password（不进 profile 表） */
export async function updatePassword(
  prevState: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { message: '请先登录。' };
  }

  const validated = PasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: '表单填写有误，请检查后重试。',
    };
  }

  const { currentPassword, newPassword } = validated.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { message: '用户不存在。' };
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return {
        errors: { currentPassword: ['当前密码不正确'] },
        message: '当前密码不正确。',
      };
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
  } catch (error) {
    console.error(error);
    return { message: '数据库错误：修改密码失败。' };
  }

  return { message: '密码已更新。' };
}
