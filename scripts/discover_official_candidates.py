"""Dated official-index checks; retain failed checks and prior captures without scientific promotion."""
from pathlib import Path
import json,hashlib,datetime,urllib.request,subprocess,sys,importlib.util
from lxml import html
ROOT=Path(__file__).resolve().parents[1];YEAR=datetime.datetime.now(datetime.timezone.utc).year
OUT=ROOT/'runs/wp1/search/partial_2026_catalogs';OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('catalog_parser',ROOT/'scripts/retrieve_official_proceedings_manifest.py');catalog=importlib.util.module_from_spec(spec);spec.loader.exec_module(catalog)
now=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
def fetch(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'PhysicsManufacturingLivingSurvey/1.0','Accept':'text/html'}),timeout=60) as response:return response.read(),response.geturl(),response.status
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
sources=[{'id':f'cvpr_{YEAR}','venue':'CVPR','year':YEAR,'url':f'https://openaccess.thecvf.com/CVPR{YEAR}?day=all','adapter':'cvf'}, {'id':f'iclr_{YEAR}','venue':'ICLR','year':YEAR,'url':f'https://proceedings.iclr.cc/paper_files/paper/{YEAR}','adapter':'iclr'}, {'id':f'ijcai_{YEAR}','venue':'IJCAI','year':YEAR,'url':f'https://www.ijcai.org/proceedings/{YEAR}/','adapter':'ijcai'}, {'id':f'neurips_{YEAR}','venue':'NeurIPS','year':YEAR,'url':f'https://proceedings.neurips.cc/paper_files/paper/{YEAR}','adapter':'neurips'}]
volumes={2025:267,2026:306}
if YEAR in volumes:sources.append({'id':f'icml_{YEAR}','venue':'ICML','year':YEAR,'url':f'https://proceedings.mlr.press/v{volumes[YEAR]}/','adapter':'pmlr'})
if YEAR%2==0:sources.append({'id':f'eccv_{YEAR}','venue':'ECCV','year':YEAR,'url':'https://www.ecva.net/papers.php','adapter':'eccv'})
else:sources.append({'id':f'iccv_{YEAR}','venue':'ICCV','year':YEAR,'url':f'https://openaccess.thecvf.com/ICCV{YEAR}?day=all','adapter':'cvf'})
results=[]
for src in sources:
 p=OUT/src['id']/'records.json';prior=json.loads(p.read_text(encoding='utf-8')) if p.exists() else None
 try:
  raw,final,status=fetch(src['url']);records=catalog.parse(src,html.fromstring(raw))
  if not records:raise ValueError('zero_records_parser_or_publication_review_required')
  digest=hashlib.sha256(raw).hexdigest();write(p,{'schema_version':'1.0','source_id':src['id'],'venue':src['venue'],'year':YEAR,'source_url':src['url'],'final_url':final,'retrieved_at':now(),'http_status':status,'raw_response_sha256':digest,'record_count':len(records),'records':records,'track_scope':'official_index; individual track eligibility pending'})
  item={'source_id':src['id'],'venue':src['venue'],'year':YEAR,'status':'index_fetched_and_parsed','records_path':p.relative_to(ROOT).as_posix(),'url':src['url'],'record_count':len(records),'capture_time':now(),'sha256':digest}
 except Exception as e:
  item={'source_id':src['id'],'venue':src['venue'],'year':YEAR,'status':'check_failed_or_parser_hold','url':src['url'],'error_class':type(e).__name__,'error':str(e),'prior_capture_retained':bool(prior),'prior_capture_time':(prior or {}).get('retrieved_at'),'record_count':(prior or {}).get('record_count',0)}
 results.append(item);print(json.dumps(item,ensure_ascii=False),flush=True)
aa=ROOT/f'runs/wp1/search/aaai_ojs_catalog/aaai_{YEAR}/records.json';prior=json.loads(aa.read_text(encoding='utf-8')) if aa.exists() else None
log=OUT/'aaai_latest_check.log'
with log.open('wb') as output:
 try:
  process=subprocess.run([sys.executable,str(ROOT/'scripts/retrieve_aaai_ojs_catalog.py'),'--year',str(YEAR)],stdout=output,stderr=subprocess.STDOUT,timeout=1200);aa_returncode=process.returncode
 except subprocess.TimeoutExpired:aa_returncode=124
results.append({'source_id':f'aaai_{YEAR}','venue':'AAAI','year':YEAR,'url':'https://ojs.aaai.org/index.php/AAAI/issue/archive','status':'index_fetched_and_parsed' if aa_returncode==0 else 'check_failed_or_parser_hold','returncode':aa_returncode,'prior_capture_retained':aa_returncode!=0 and bool(prior),'records_path':aa.relative_to(ROOT).as_posix(),'log_sha256':hashlib.sha256(log.read_bytes()).hexdigest()})
if YEAR not in volumes:results.append({'source_id':f'icml_{YEAR}','venue':'ICML','year':YEAR,'status':'source_locator_review_required','note':'Official PMLR volume mapping must be verified before collection; no invented current-year URL.'})
results.append({'source_id':f'{"iccv" if YEAR%2==0 else "eccv"}_{YEAR}','venue':'ICCV' if YEAR%2==0 else 'ECCV','year':YEAR,'status':'biennial_off_year'})
runid='catalog_2026_partial_'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
write(OUT/(runid+'_summary.json'),{'schema_version':'1.0','run_id':runid,'year':YEAR,'cutoff_date':datetime.datetime.now(datetime.timezone.utc).date().isoformat(),'classification':'dated current-year source checks; prior captures retain original dates; separate from completed-year scientific corpus','catalogs':results,'venue_availability':results,'limitations':['A failed check does not prove a source or paper is absent.','Retained captures are not newly retrieved records.','Title candidates require subsequent eligibility and release/physics review.']})
# Build the candidate queue from dated captures, retaining original scope/status fields.
subprocess.run([sys.executable,str(ROOT/'scripts/build_2026_discovery_queue.py')],check=True)
subprocess.run([sys.executable,str(ROOT/'scripts/check_2026_discovery_queue.py')],check=True)
print(json.dumps({'official_source_checks':len(results),'scientific_graph_changed':False,'new_inclusion_or_industrial_pass':False}),flush=True)
