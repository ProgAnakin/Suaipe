import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),error:false}));
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
  rpc:mocks.rpc,
  from:()=>{
    const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>Promise.resolve({data:[{id:'synthetic-task',email:'synthetic@example.com',provider:'brevo',created_at:'2026-11-06'}],error:null})};return q;
  },
}}));
import { PrivacyOperationsTab } from '@/components/manager/PrivacyOperationsTab';
beforeEach(()=>{
  vi.restoreAllMocks();vi.clearAllMocks();mocks.error=false;
  vi.spyOn(window,'confirm').mockReturnValue(true);
  mocks.rpc.mockImplementation(async name=>name==='privacy_operations_status'
    ? {data:{last_maintenance:new Date().toISOString(),erasure_pending:1,email_reconciliation_pending:0},error:mocks.error?{code:'42501'}:null}
    : {data:1,error:null});
});
describe('Privacy operator workflow',()=>{
  it('does not imply deletion of external copies after local erasure',async()=>{
    render(<PrivacyOperationsTab/>);await screen.findByText('brevo: synthetic@example.com');
    fireEvent.change(screen.getByLabelText('Verified customer email'),{target:{value:'synthetic@example.com'}});
    await act(async()=>{fireEvent.click(screen.getByText('Delete local sessions'));});
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('erase_customer_data',{p_email:'synthetic@example.com'}));
    expect(mocks.rpc.mock.calls.some(c=>c[0]==='complete_external_erasure')).toBe(false);
    expect(screen.getByText(/Local deletion does not erase provider copies/)).toBeVisible();
  });
  it('allows cancellation before local deletion',async()=>{
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<PrivacyOperationsTab/>);await screen.findByText('brevo: synthetic@example.com');
    fireEvent.change(screen.getByLabelText('Verified customer email'),{target:{value:'synthetic@example.com'}});
    await act(async()=>{fireEvent.click(screen.getByText('Delete local sessions'));});
    expect(mocks.rpc.mock.calls.some(c=>c[0]==='erase_customer_data')).toBe(false);
  });
  it('records an explicit operator confirmation for the correct task',async()=>{
    render(<PrivacyOperationsTab/>);await screen.findByText('brevo: synthetic@example.com');
    await act(async()=>{fireEvent.click(screen.getByText('Provider deletion verified'));});
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('complete_external_erasure',{p_id:'synthetic-task',p_not_applicable:false}));
  });
  it('does not display queue data after protected overview is denied',async()=>{
    mocks.error=true;render(<PrivacyOperationsTab/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load');
    expect(screen.queryByText('brevo: synthetic@example.com')).not.toBeInTheDocument();
  });
  it('keeps correction separate from deletion and uses the verified exact address',async()=>{
    render(<PrivacyOperationsTab/>);await screen.findByText('brevo: synthetic@example.com');
    fireEvent.change(screen.getByLabelText('Verified customer email'),{target:{value:'synthetic@example.com'}});
    fireEvent.change(screen.getByLabelText('Corrected first name'),{target:{value:'Corrected'}});
    fireEvent.change(screen.getByLabelText('Corrected last name'),{target:{value:'Visitor'}});
    await act(async()=>fireEvent.click(screen.getByText('Apply verified name correction')));
    expect(mocks.rpc).toHaveBeenCalledWith('correct_customer_names',{p_email:'synthetic@example.com',p_nome:'Corrected',p_cognome:'Visitor'});
    expect(mocks.rpc.mock.calls.some(c=>c[0]==='erase_customer_data')).toBe(false);
  });
  it('allows cancellation before a subject export without fetching customer records',async()=>{
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<PrivacyOperationsTab/>);await screen.findByText('brevo: synthetic@example.com');
    fireEvent.change(screen.getByLabelText('Verified customer email'),{target:{value:'synthetic@example.com'}});
    await act(async()=>fireEvent.click(screen.getByText('Export verified customer records')));
    expect(mocks.rpc.mock.calls.some(c=>c[0]==='get_customer_records')).toBe(false);
  });
});
