from __future__ import annotations
import hashlib, json, re, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin
from lxml import html

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'runs/wp1/search/official_proceedings_manifests'
OUT.mkdir(parents=True,exist_ok=True)
UA='PhysicsManufacturingSurveyManifest/1.0 (research metadata retrieval; contact via project README)'
SOURCES=[
 {'id':'neurips_2025','venue':'NeurIPS','year':2025,'cycle':'main_and_official_datasets_benchmarks','url':'https://proceedings.neurips.cc/paper_files/paper/2025/vol38-main-conference','adapter':'neurips'},
 {'id':'icml_2025','venue':'ICML','year':2025,'cycle':'main_and_official_tracks_in_pmlr_volume_267','url':'https://proceedings.mlr.press/v267/','adapter':'pmlr'},
 {'id':'iclr_2025','venue':'ICLR','year':2025,'cycle':'main_conference','url':'https://proceedings.iclr.cc/paper_files/paper/2025','adapter':'iclr'},
 {'id':'cvpr_2025','venue':'CVPR','year':2025,'cycle':'main_conference','url':'https://openaccess.thecvf.com/CVPR2025?day=all','adapter':'cvf'},
 {'id':'iccv_2025','venue':'ICCV','year':2025,'cycle':'main_conference','url':'https://openaccess.thecvf.com/ICCV2025?day=all','adapter':'cvf'},
 {'id':'eccv_2024','venue':'ECCV','year':2024,'cycle':'main_conference','url':'https://www.ecva.net/papers.php','adapter':'eccv'},
 {'id':'ijcai_2025','venue':'IJCAI','year':2025,'cycle':'main_track','url':'https://www.ijcai.org/proceedings/2025/','adapter':'ijcai'},
 {'id':'aaai_2025','venue':'AAAI','year':2025,'cycle':'technical_tracks','url':'https://aaai.org/proceeding/aaai-39-2025/','adapter':'aaai'},
]

def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/html,application/xhtml+xml'})
 with urllib.request.urlopen(req,timeout=45) as r:
  body=r.read(); return body,r.geturl(),r.status,r.headers.get('Content-Type')

def clean(s): return re.sub(r'\s+',' ',s or '').strip()
def same_year_href(href, conf, year):
 return f'{conf}{year}' in href

def parse(src, root):
 adapter=src['adapter']; year=src['year']; venue=src['venue']; recs=[]
 if adapter=='pmlr':
  for box in root.xpath('//div[contains(concat(" ",normalize-space(@class)," ")," paper ")]'):
   title=clean(' '.join(box.xpath('.//p[contains(@class,"title")]//text()')))
   authors=clean(' '.join(box.xpath('.//p[contains(@class,"details")]//span[contains(@class,"authors")]//text()')))
   abs_links=box.xpath('.//p[contains(@class,"links")]//a[contains(translate(normalize-space(.),"ABS","abs"),"abs")]')
   if not abs_links: abs_links=box.xpath('.//a[contains(@href,".html")]')
   if not title or not abs_links: continue
   href=abs_links[0].get('href'); url=urljoin(src['url'],href)
   recs.append({'title':title,'authors':authors or None,'track':'icml_proceedings_volume','proceedings_url':url,'abstract_url':url,'doi':None,'record_id':Path(href).stem})
  return recs
 if adapter=='ijcai':
  for box in root.xpath('//div[contains(concat(" ",normalize-space(@class)," ")," paper_wrapper ")]'):
   title=clean(' '.join(box.xpath('.//div[contains(@class,"title")]//text()')))
   authors=clean(' '.join(box.xpath('.//div[contains(@class,"authors")]//text()')))
   detail=box.xpath('.//a[contains(@href,"/proceedings/")]')
   if not title or not detail: continue
   url=urljoin(src['url'],detail[-1].get('href'))
   recs.append({'title':title,'authors':authors or None,'track':'main_track','proceedings_url':url,'abstract_url':url,'doi':None,'record_id':url.rstrip('/').split('/')[-1]})
  return recs
 if adapter=='eccv':
  for a in root.xpath('//dt[contains(@class,"ptitle")]//a[@href]'):
   href=a.get('href',''); title=clean(a.text_content())
   if f'papers/eccv_{year}/papers_ECCV/html/' not in href or not href.endswith(f'_ECCV_{year}_paper.php') or not title: continue
   url=urljoin(src['url'],href)
   recs.append({'title':title,'authors':None,'track':'main_conference','proceedings_url':url,'abstract_url':url,'doi':None,'record_id':Path(href).stem})
  return recs
 for a in root.xpath('//a[@href]'):
  href=a.get('href',''); title=clean(a.text_content())
  if not title or len(title)<5: continue
  abs_url=urljoin(src['url'],href); track='main_or_unspecified'
  if adapter=='neurips':
   if f'/paper_files/paper/{year}/' not in href or '-Abstract' not in href: continue
   if 'Datasets_and_Benchmarks' in href: track='official_datasets_and_benchmarks'
   elif 'Evaluations_and_Demos' in href: track='official_evaluations_and_demos'
   elif 'Creative_AI' in href: track='official_creative_ai'
   else: track='main_conference'
  elif adapter=='iclr':
   if f'/paper_files/paper/{year}/' not in href or '-Abstract-' not in href: continue
   track='main_conference'
  elif adapter=='cvf':
   if not re.search(rf'(?:/content/{venue}{year}/html/|content_{venue}_{year}/html/)[^/]+_paper\.html',href): continue
   track='main_conference'
  elif adapter=='aaai':
   continue
  else: continue
  recs.append({'title':title,'authors':None,'track':track,'proceedings_url':abs_url,'abstract_url':abs_url,'doi':None,'record_id':Path(href).stem})
 return recs

def main():
 run_id='venue_catalog_20261010T'+datetime.now(timezone.utc).strftime('%H%M%SZ')
 results=[]
 for src in SOURCES:
  started=datetime.now(timezone.utc).isoformat()
  item={**src,'run_id':run_id,'executed_at':started,'status':'pending','reported_hit_count':None,'fetched_record_count':0,'raw_response_path':None,'sha256':None,'records_path':None,'error':None}
  try:
   raw,final_url,httpstatus,ctype=fetch(src['url'])
   rawhash=hashlib.sha256(raw).hexdigest(); base=OUT/src['id']; base.mkdir(parents=True,exist_ok=True)
   rawpath=base/'index.html';rawpath.write_bytes(raw)
   root=html.fromstring(raw)
   records=parse(src,root)
   # Preserve the full source response and exact extracted record set separately.
   records_path=base/'records.json'
   records_payload={'schema_version':'1.0','source_id':src['id'],'venue':src['venue'],'year':src['year'],'track_scope':src['cycle'],'source_url':src['url'],'final_url':final_url,'executed_at':started,'http_status':httpstatus,'content_type':ctype,'raw_response_sha256':rawhash,'raw_response_bytes':len(raw),'record_count':len(records),'records':records}
   records_path.write_text(json.dumps(records_payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
   item.update({'status':'index_fetched_and_parsed','final_url':final_url,'http_status':httpstatus,'content_type':ctype,'reported_hit_count':None,'fetched_record_count':len(records),'raw_response_path':str(rawpath.relative_to(ROOT)).replace('\\','/'),'sha256':rawhash,'records_path':str(records_path.relative_to(ROOT)).replace('\\','/')})
  except Exception as e:
   item.update({'status':'failed','error':f'{type(e).__name__}: {e}'})
  results.append(item)
  print(json.dumps({'source_id':item['id'],'status':item['status'],'records':item['fetched_record_count'],'sha256':item['sha256'],'error':item['error']},ensure_ascii=False),flush=True)
  time.sleep(0.5)
 # A broad candidate retrieval over title metadata only; explicitly not the abstract search.
 keywords=re.compile(r'manufactur|industrial|defect|litho|fabricat|additive|physics|physical|synthe|generat|process|simulation|cad|airfoil|assembly|inspection|anomal|3d.print|weld|machin|semiconductor|wafer|material|thermal|fluid|geometry',re.I)
 title_hits=[]
 for item in results:
  if not item['records_path']: continue
  payload=json.loads((ROOT/item['records_path']).read_text(encoding='utf-8'))
  for r in payload['records']:
   if keywords.search(r['title']): title_hits.append({'source_id':item['id'],'venue':item['venue'],'year':item['year'],**r})
 hits_path=OUT/f'{run_id}_title_candidate_retrieval.json'
 hits_path.write_text(json.dumps({'query_type':'broad_title_only_candidate_retrieval_not_systematic_abstract_search','query_expression':keywords.pattern,'executed_at':datetime.now(timezone.utc).isoformat(),'record_count':len(title_hits),'records':title_hits},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 summary={'schema_version':'1.0','run_id':run_id,'executed_at':datetime.now(timezone.utc).isoformat(),'classification':'partial_official_catalog_retrieval; not complete corpus; title-only candidate retrieval is not systematic fulltext search','catalogs':results,'title_candidate_retrieval_path':str(hits_path.relative_to(ROOT)).replace('\\','/'),'title_candidate_count':len(title_hits),'complete_2020_2025_venue_year_coverage':False,'limitations':['Catalog endpoint availability and completeness must be checked against each conference year/track.','Abstracts were not searched; title-only candidates cannot support exclusion or prevalence claims.','AAAI endpoint may block automated fetch; unresolved venue-years remain uncovered.','NeurIPS 2025 Datasets & Benchmarks subtrack must be confirmed as present in the selected main index.']}
 (OUT/f'{run_id}_summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'run_id':run_id,'title_candidate_count':len(title_hits),'summary_path':str((OUT/f'{run_id}_summary.json').relative_to(ROOT))},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
