import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ consumed: vi.fn(), signIn: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: (name: string) => name === 'record_login_attempt'
    ? { then: (resolve: (value: unknown) => unknown) => { mocks.consumed(); return Promise.resolve({ error: null }).then(resolve); } }
    : Promise.resolve({ data: { locked: false } }),
  auth: { signInWithPassword: mocks.signIn },
} }));
import { LoginForm } from '@/components/stats/LoginForm';
beforeEach(() => { mocks.consumed.mockClear(); mocks.signIn.mockReset(); });
describe('login failures', () => {
  it('uses Auth without a client-writable audit RPC', async () => {
    mocks.signIn.mockResolvedValue({ error: { message: 'invalid' } });
    render(<LoginForm onLoginSuccess={vi.fn()} onMfaRequired={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'incorrect' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledOnce());
    expect(mocks.consumed).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Invalid credentials.')).toBeVisible());
  });
});
