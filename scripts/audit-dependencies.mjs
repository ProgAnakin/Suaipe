import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const exception=JSON.parse(readFileSync(new URL('../config/dependency-exceptions.json',import.meta.url),'utf8'));
const filename=process.argv[2];
const scan=filename?{stdout:readFileSync(filename,'utf8'),status:1}:spawnSync('npm',['audit','--json'],{encoding:'utf8',maxBuffer:8*1024*1024});
let report;
try {report=JSON.parse(scan.stdout);} catch {throw new Error('Dependency audit did not return valid JSON.');}
if (scan.error || !report.metadata?.vulnerabilities || report.error || !report.vulnerabilities) throw new Error('Dependency audit unavailable.');
const allowed=new Set(exception.packages);
const unreviewed=Object.entries(report.vulnerabilities).filter(([name,item])=>
  !allowed.has(name) || item.isDirect && !['vite-plugin-pwa'].includes(name) || item.severity!=='low' ||
  item.via.some(v=>typeof v==='string'?!allowed.has(v):v.url!==exception.advisory));
if (Object.keys(report.vulnerabilities).length && new Date()>=new Date(exception.expires+'T00:00:00Z')) throw new Error('Dependency exception expired. Review upstream fixes.');
if (unreviewed.length) throw new Error('Unreviewed dependency advisories: '+unreviewed.map(([name])=>name).join(', '));
console.log(JSON.stringify({audit:report.metadata.vulnerabilities,documented_build_exception:allowed.size,expires:exception.expires,human_review:exception.human_review}));
