'use client';

import { Button } from '@/app/ui/button';
import {
  updateProfile,
  updatePassword,
  ProfileFormState,
  PasswordFormState,
} from '@/app/lib/actions';
import { useActionState } from 'react';

type ProfileDefaults = {
  email: string;
  nickname: string;
  phone: string;
  bio: string;
  avatarUrl: string;
};

export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const initialState: ProfileFormState = { message: null, errors: {} };
  const [state, formAction] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="rounded-md bg-gray-50 p-4 md:p-6">
      <h2 className="mb-4 text-lg font-medium">个人资料</h2>
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium">登录邮箱</label>
        <input
          type="email"
          value={defaults.email}
          disabled
          className="block w-full rounded-md border border-gray-200 bg-gray-100 py-2 px-3 text-sm text-gray-500"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="nickname" className="mb-2 block text-sm font-medium">
          昵称
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          defaultValue={defaults.nickname}
          className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="phone" className="mb-2 block text-sm font-medium">
          手机
        </label>
        <input
          id="phone"
          name="phone"
          type="text"
          defaultValue={defaults.phone}
          className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="avatarUrl" className="mb-2 block text-sm font-medium">
          头像 URL
        </label>
        <input
          id="avatarUrl"
          name="avatarUrl"
          type="text"
          defaultValue={defaults.avatarUrl}
          className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="bio" className="mb-2 block text-sm font-medium">
          简介
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={defaults.bio}
          className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
        />
      </div>
      {state.message ? (
        <p className="mb-4 text-sm text-green-600">{state.message}</p>
      ) : null}
      <Button type="submit">保存资料</Button>
    </form>
  );
}

export function PasswordForm() {
  const initialState: PasswordFormState = { message: null, errors: {} };
  const [state, formAction] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="rounded-md bg-gray-50 p-4 md:p-6">
      <h2 className="mb-4 text-lg font-medium">修改密码</h2>
      <div className="mb-4">
        <label
          htmlFor="currentPassword"
          className="mb-2 block text-sm font-medium"
        >
          当前密码
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
        />
        {state.errors?.currentPassword ? (
          <p className="mt-1 text-sm text-red-500">
            {state.errors.currentPassword[0]}
          </p>
        ) : null}
      </div>
      <div className="mb-4">
        <label htmlFor="newPassword" className="mb-2 block text-sm font-medium">
          新密码
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={6}
          className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
        />
        {state.errors?.newPassword ? (
          <p className="mt-1 text-sm text-red-500">
            {state.errors.newPassword[0]}
          </p>
        ) : null}
      </div>
      <div className="mb-4">
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-medium"
        >
          确认新密码
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
        />
        {state.errors?.confirmPassword ? (
          <p className="mt-1 text-sm text-red-500">
            {state.errors.confirmPassword[0]}
          </p>
        ) : null}
      </div>
      {state.message ? (
        <p
          className={`mb-4 text-sm ${
            state.message.includes('已更新')
              ? 'text-green-600'
              : 'text-red-500'
          }`}
        >
          {state.message}
        </p>
      ) : null}
      <Button type="submit">更新密码</Button>
    </form>
  );
}
