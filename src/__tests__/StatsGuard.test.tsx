import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),aal:vi.fn(),roles:vi.fn(),signOut:vi.fn(),event:null as null|((event:string)=>void)}));
vi.mock('@/integrations/supabase/client',()=>({LEGACY_AUTH_STORAGE_KEY:'sb-fixture-auth-token',supabase:{rpc:m.roles,auth:{getSession:m.session,signOut:m.signOut,mfa:{getAuthenticatorAssuranceLevel:m.aal},onAuthStateChange:(callback:(event:string)=>void)=>{m.event=callback;return {data:{subscription:{unsubscribe:vi.fn()}}};}}}}));
vi.mock('@/components/stats/LoginForm',()=>({LoginForm:()=> <p>Staff login</p>}));
vi.mock('@/components/stats/Dashboard',()=>({Dashboard:()=> <p>Protected statistics</p>}));
vi.mock('@/components/stats/MfaVerifyForm',()=>({MfaVerifyForm:()=> <p>Second factor required</p>}));
vi.mock('@/components/stats/MfaSetupModal',()=>({MfaSetupModal:()=> <p>Enroll second factor</p>}));
vi.mock('framer-motion',()=>({AnimatePresence:({children}:{children:React.ReactNode})=>children,motion:{div:({children}:{children:React.ReactNode})=><div>{children}</div>}}));
import Stats from '@/pages/Stats';
const mount=()=>render(<MemoryRouter><Stats/></MemoryRouter>);
beforeEach(()=>{
 vi.clearAllMocks();m.session.mockResolvedValue({data:{session:{access_token:'fixture'}}});m.aal.mockResolvedValue({data:{currentLevel:'aal2'}});
 m.roles.mockResolvedValue({data:[{role:'manager'}]});m.signOut.mockResolvedValue({error:null});
});
describe('statistics authorization lifecycle',()=>{
 it('requires a staff role in addition to MFA',async()=>{
  m.roles.mockResolvedValue({data:[]});mount();expect(await screen.findByText('Staff login')).toBeVisible();
  expect(screen.queryByText('Protected statistics')).not.toBeInTheDocument();expect(m.signOut).toHaveBeenCalledWith({scope:'local'});
 });
 it('permits staff with MFA and removes data immediately on sign-out',async()=>{
  mount();await screen.findByText('Protected statistics');
  act(()=>m.event?.('SIGNED_OUT'));expect(screen.queryByText('Protected statistics')).not.toBeInTheDocument();
 });
 it('does not revive protected data after a late role response',async()=>{
  let resolve!:(value:unknown)=>void;m.roles.mockImplementation(()=>new Promise(r=>{resolve=r;}));mount();
  await act(async()=>{});act(()=>m.event?.('SIGNED_OUT'));
  await act(async()=>resolve({data:[{role:'manager'}]}));
  expect(screen.getByText('Staff login')).toBeVisible();expect(screen.queryByText('Protected statistics')).not.toBeInTheDocument();
 });
 it('requires verification for a password-only session',async()=>{
  m.aal.mockResolvedValue({data:{currentLevel:'aal1',nextLevel:'aal2'}});mount();
  expect(await screen.findByText('Second factor required')).toBeVisible();expect(m.roles).not.toHaveBeenCalled();
 });
 it('hides data while rechecking a refreshed session',async()=>{
  mount();await screen.findByText('Protected statistics');m.session.mockResolvedValue({data:{session:null}});
  act(()=>m.event?.('TOKEN_REFRESHED'));expect(screen.queryByText('Protected statistics')).not.toBeInTheDocument();
  expect(await screen.findByText('Staff login')).toBeVisible();
 });
});
