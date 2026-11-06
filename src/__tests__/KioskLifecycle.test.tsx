import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({demo:false,from:vi.fn(),submit:vi.fn(),reset:null as null|(()=>void)}));
vi.mock('@/config/demo',()=>({get IS_DEMO(){return mocks.demo;}}));
vi.mock('@/lib/submitClaim',()=>({submitClaim:mocks.submit}));
vi.mock('@/lib/startupCache',()=>({readCache:()=>null,writeCache:vi.fn()}));
vi.mock('@/data/stores',()=>({getStoredStoreId:()=> 'lisboa'}));
vi.mock('@/i18n/LanguageContext',()=>({useLang:()=>({lang:'en',t:{}})}));
vi.mock('@/hooks/useKioskMode',()=>({useKioskMode:()=>({isKioskLocked:false,deactivateKiosk:vi.fn()})}));
vi.mock('@/hooks/useOnlineStatus',()=>({useOnlineStatus:()=>true}));
vi.mock('@/hooks/useWakeLock',()=>({useWakeLock:vi.fn()}));
vi.mock('@/hooks/useBgMusic',()=>({useBgMusic:vi.fn()}));
vi.mock('@/hooks/useLockBodyScroll',()=>({useLockBodyScroll:vi.fn()}));
vi.mock('@/hooks/useInactivityReset',()=>({useInactivityReset:({onReset}:{onReset:()=>void})=>{mocks.reset=onReset;return {dismiss:vi.fn()};}}));
vi.mock('framer-motion',()=>({AnimatePresence:({children}:{children:React.ReactNode})=>children,motion:{div:({children}:{children:React.ReactNode})=><div>{children}</div>}}));
vi.mock('@/components/AttractScreen',()=>({default:({onComplete}:{onComplete:()=>void})=><button onClick={onComplete}>Start kiosk</button>}));
vi.mock('@/components/WelcomeScreen',()=>({default:({onStart,unavailable,demo}:{onStart:(v:unknown)=>void;unavailable:boolean;demo:boolean})=><button disabled={unavailable} onClick={()=>onStart({nome:'Synthetic',cognome:'Visitor',email:demo?'demo@example.invalid':'original@example.com',consentGivenAt:new Date().toISOString()})}>Continue welcome</button>}));
vi.mock('@/components/QuizScreen',()=>({default:({onComplete}:{onComplete:(v:unknown)=>void})=><button onClick={()=>onComplete({1:true})}>Complete quiz</button>}));
vi.mock('@/components/MatchResult',()=>({default:({userEmail,onClaim,onChangeEmail,onRestart,emailLocked}:{userEmail:string;onClaim:()=>void;onChangeEmail:(s:string)=>void;onRestart:()=>void;emailLocked:boolean})=><div><p>{userEmail}</p><p>{emailLocked?'address locked':'address editable'}</p><button onClick={onClaim}>Claim result</button><button onClick={()=>onChangeEmail('changed@example.com')}>Change address</button><button onClick={onRestart}>Restart result</button></div>}));
vi.mock('@/components/SuccessScreen',()=>({default:({email}:{email:string})=><p>Recorded for {email}</p>}));
vi.mock('@/integrations/supabase/client',()=>({LEGACY_AUTH_STORAGE_KEY:'sb-synthetic-auth-token',supabase:{auth:{stopAutoRefresh:vi.fn(),startAutoRefresh:vi.fn(),signOut:vi.fn(async()=>({error:null})),onAuthStateChange:()=>({data:{subscription:{unsubscribe:vi.fn()}}})},from:mocks.from,rpc:(name:string)=>Promise.resolve({error:null,data:name==='kiosk_ready'?true:null})}}));
import Index from '@/pages/Index';
beforeEach(()=>{
  mocks.demo=false;vi.clearAllMocks();
  mocks.from.mockImplementation((table:string)=>{
    const query={select:()=>query,eq:()=>query,order:()=>query,limit:()=>query,
      then(resolve:(v:unknown)=>unknown){return Promise.resolve({error:null,data:table==='custom_products'?[{id:'synthetic',name:'Synthetic product',price:'EUR 100',tags:['audio'],faq:[]}]:[]}).then(resolve);}};
    return query;
  });
});
async function reachResult(){
  render(<Index/>);
  fireEvent.click(await screen.findByText('Start kiosk'));
  await act(async()=>{});
  fireEvent.click(await screen.findByText('Continue welcome'));
  fireEvent.click(await screen.findByText('Complete quiz'));
  await screen.findByText('Claim result');
}
describe('Kiosk business lifecycle',()=>{
  it('keeps address and request immutable after an ambiguous failure',async()=>{
    mocks.submit.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await reachResult();
    await act(async()=>{fireEvent.click(screen.getByText('Claim result'));});
    expect(screen.getByText('address locked')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Change address'));
    expect(screen.queryByText('changed@example.com')).not.toBeInTheDocument();
    await act(async()=>{fireEvent.click(screen.getByText('Claim result'));});
    expect(mocks.submit.mock.calls[0].slice(0,2)).toEqual(mocks.submit.mock.calls[1].slice(0,2));
    expect(screen.getByText('Recorded for original@example.com')).toBeInTheDocument();
  });
  it('does not revive a visitor after reset while the request was pending',async()=>{
    let resolve!:(v:boolean)=>void;
    mocks.submit.mockImplementation(()=>new Promise<boolean>(r=>{resolve=r;}));
    await reachResult();fireEvent.click(screen.getByText('Claim result'));
    act(()=>{mocks.reset?.();});
    await act(async()=>{resolve(true);});
    expect(screen.getByText('Start kiosk')).toBeInTheDocument();
    expect(screen.queryByText(/Recorded for/)).not.toBeInTheDocument();
    expect(mocks.submit.mock.calls[0][2].aborted).toBe(true);
  });
  it('completes the demo without reading or writing the real backend',async()=>{
    mocks.demo=true;await reachResult();fireEvent.click(screen.getByText('Claim result'));
    expect(screen.getByText('Recorded for demo@example.invalid')).toBeInTheDocument();
    expect(mocks.from).not.toHaveBeenCalled();expect(mocks.submit).not.toHaveBeenCalled();
  });
});
