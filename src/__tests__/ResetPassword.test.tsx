import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({update:vi.fn(),event:null as null|((event:string)=>void)}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{updateUser:m.update,onAuthStateChange:(callback:(event:string)=>void)=>{m.event=callback;return {data:{subscription:{unsubscribe:vi.fn()}}};}}}}));
import ResetPassword from '@/pages/ResetPassword';
const mount=()=>render(<MemoryRouter><ResetPassword/></MemoryRouter>);
beforeEach(()=>{vi.clearAllMocks();m.update.mockResolvedValue({error:null});});
afterEach(()=>vi.useRealTimers());
const enter=()=>{act(()=>m.event?.('PASSWORD_RECOVERY'));fireEvent.change(screen.getByLabelText('Nuova password'),{target:{value:'correct horse battery'}});fireEvent.change(screen.getByLabelText('Conferma password'),{target:{value:'correct horse battery'}});};
describe('password recovery failures',()=>{
 it('does not expose a password form without a verified recovery event',()=>{
  mount();expect(screen.queryByLabelText('Nuova password')).not.toBeInTheDocument();expect(m.update).not.toHaveBeenCalled();
 });
 it('offers a recovery path when a link expires or never validates',async()=>{
  vi.useFakeTimers();mount();act(()=>vi.advanceTimersByTime(10_000));
  expect(screen.getByRole('alert')).toHaveTextContent('scaduto');expect(screen.getByRole('link')).toHaveAttribute('href','/stats');
 });
 it('prevents duplicate password mutations while a request is pending',()=>{
  m.update.mockReturnValue(new Promise(()=>{}));mount();enter();
  fireEvent.click(screen.getByRole('button',{name:'Salva Password'}));
  fireEvent.keyDown(screen.getByLabelText('Conferma password'),{key:'Enter'});
  expect(m.update).toHaveBeenCalledOnce();
 });
 it('recovers from a transport failure without exposing internal details',async()=>{
  m.update.mockRejectedValue(new Error('private-backend-detail'));mount();enter();
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Salva Password'})));
  expect(screen.getByRole('alert')).toHaveTextContent('Riprova');
  expect(screen.queryByText('private-backend-detail')).not.toBeInTheDocument();expect(screen.getByRole('button')).toBeEnabled();
 });
});
