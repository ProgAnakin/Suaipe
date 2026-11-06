import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), aal: vi.fn(), roles: vi.fn(), event: null as null | (() => void) }));
vi.mock('@/integrations/supabase/client', () => ({supabase:{
  rpc: mocks.roles,
  auth:{getSession:mocks.session,mfa:{getAuthenticatorAssuranceLevel:mocks.aal},
    onAuthStateChange(callback:()=>void) { mocks.event=callback; return {data:{subscription:{unsubscribe:vi.fn()}}}; }},
}}));
vi.mock('@/components/manager/ManagerDashboard', () => ({ManagerDashboard:()=> <p>Protected manager area</p>}));
import Manager from '@/pages/Manager';
function mount() { return render(<MemoryRouter initialEntries={['/manager']}><Routes><Route path="/manager" element={<Manager/>}/><Route path="/stats" element={<p>Login required</p>}/></Routes></MemoryRouter>); }
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({data:{session:{access_token:'synthetic'}},error:null});
  mocks.aal.mockResolvedValue({data:{currentLevel:'aal2'},error:null});
  mocks.roles.mockResolvedValue({data:[{role:'manager'}],error:null});
});
describe('Manager authorization lifecycle', () => {
  it.each(['manager','consulente_responsabile'])('permits %s with MFA', async role => {
    mocks.roles.mockResolvedValue({data:[{role}],error:null}); mount();
    await waitFor(() => expect(screen.getByText('Protected manager area')).toBeVisible());
  });
  it('denies a password-only session', async () => {
    mocks.aal.mockResolvedValue({data:{currentLevel:'aal1'}}); mount();
    expect(await screen.findByText('Login required')).toBeVisible();
    expect(mocks.roles).not.toHaveBeenCalled();
  });
  it('denies a consultant even with MFA', async () => {
    mocks.roles.mockResolvedValue({data:[{role:'consulente'}]}); mount();
    expect(await screen.findByText('Login required')).toBeVisible();
  });
  it('denies unavailable role data', async () => {
    mocks.roles.mockResolvedValue({data:null,error:{message:'offline'}}); mount();
    expect(await screen.findByText('Login required')).toBeVisible();
  });
  it('removes protected content immediately when auth changes', async () => {
    mount(); await screen.findByText('Protected manager area');
    mocks.session.mockResolvedValue({data:{session:null}});
    act(() => { mocks.event?.(); });
    expect(screen.queryByText('Protected manager area')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Login required')).toBeVisible());
  });
});
