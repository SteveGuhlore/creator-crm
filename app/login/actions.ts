'use server';

import { AuthError } from 'next-auth';
import { signIn } from '@/lib/auth';

export interface LoginState {
  error?: string;
}

export async function authenticate(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password.' };
    }
    // signIn throws a redirect on success — must be re-thrown to let it happen.
    throw error;
  }
}
