"""Public closure checks require no private papers, model assets, host paths, or manuscript files."""
from pathlib import Path
import json,hashlib,re,urllib.parse
from html.parser import HTMLParser
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
g=read('service/data/knowledge_graph.json');parent=read('provenance/parent_graph_0.9.39.json');reg=read('evidence/source_registry.json')['sources'];ids={n['id'] for n in g['nodes']};sids={s['source_id'] for s in reg}
assert g['graph_version']=='0.9.40' and (len(g['nodes']),len(g['edges']))==(2083,2451)
assert len(ids)==len(g['nodes']) and len({e['id'] for e in g['edges']})==len(g['edges'])
assert all(e['source'] in ids and e['target'] in ids for e in g['edges'])
assert g['nodes'][:1947]==parent['nodes'] and g['edges'][:2269]==parent['edges']
assert len(reg)==len(sids)==374
assert sum(n['type']=='Work' for n in g['nodes'])==95 and sum(n['type']=='ExecutionRun' for n in g['nodes'])==89
assert g['summary']['industrial_readiness_passes']==0 and g['summary']['methods_executed']==9 and g['summary']['methods_with_passed_generation_runs']==6
assert all(not n['properties'].get('R4_clean_start_pass',False) and not n['properties'].get('industrial_pass',False) for n in g['nodes'] if n['type']=='ExecutionRun')
assert (R/'service/data/knowledge_graph.js').read_text(encoding='utf-8')=='window.KNOWLEDGE_GRAPH='+json.dumps(g,ensure_ascii=False,separators=(',',':'))+';\n'
for n in g['nodes']:
 p=n['properties'];assert not p.get('source_id') or p['source_id'] in sids
 if p.get('source_ids'):assert set(p['source_ids'])<=sids
pub=read('service/data/physical_design_evidence_integrated.json');assert not pub['submission_ready'] and not pub['scientific_R4_pass'] and not pub['industrial_pass']
assert len(pub['records'])==2 and sum(r['pages'] for r in pub['records'])==47 and sum(len(r['claims']) for r in pub['records'])==31
assert len(pub['runs'])==3 and sum(r['task_output_generated'] for r in pub['runs'])==1 and not any(r['original_program_completed'] for r in pub['runs'])
assert pub['observed_mesh']['vertices']==60978 and pub['observed_mesh']['faces']==121956 and not pub['observed_mesh']['raw_outputs_redistributed']
assert pub['memory']['mapping_unresolved'] and not pub['memory']['minimum_VRAM_established']
assert not list((R/'service').rglob('*.pdf')) and not list((R/'service').rglob('*.png')) and not list((R/'service').rglob('*.csv'))
privacy=re.compile(r'(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{25,}|Bearer\s+[A-Za-z0-9._-]{20,}|(?<!\w)[A-Za-z]:[\\/]|/mnt/[a-z]/)')
for p in (R/'service').rglob('*'):
 if p.is_file():assert not privacy.search(p.read_text(encoding='utf-8')),p.relative_to(R)
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ['href','src'] and v:self.links.append(v)
for p in (R/'service').glob('*.html'):
 parser=Links();parser.feed(p.read_text(encoding='utf-8'))
 for value in parser.links:
  url=urllib.parse.urlsplit(value)
  if url.scheme or url.netloc or not url.path:continue
  assert (p.parent/urllib.parse.unquote(url.path)).is_file(),(p.name,value)

# New source/observation scope checks;no private dependencies or scientific promotion.
constraint=read('service/data/hard_constraint_evidence_integrated.json')
assert len(constraint['records'])==2 and sum(len(x['claims']) for x in constraint['records'])==29
assert constraint['records'][0]['all_PDF_text_scientifically_read'] and not constraint['records'][1]['all_PDF_text_scientifically_read']
assert constraint['PBFM']['nonpositive_K_points']==[4,0] and constraint['PBFM']['samples_with_nonpositive_K']==[1,0]
by={n['id']:n for n in g['nodes']}
assert not any('PCFM' in n['id'] for n in g['nodes'] if n['type']=='ExecutionRun')
assert by['constraint040:run:PBFM:original_entry']['properties']['status']=='failed'
q=by['constraint040:run:PBFM:bounded_original_sampler']['properties']
assert q['generated_sample_count']==64 and q['sample_generation_executed'] and not q['original_program_completed'] and not q['scientific_R4_pass']
rp=[n['properties'] for n in g['nodes'] if n['type']=='ExecutionRun']
assert len({p['work_id'] for p in rp if p.get('sample_generation_executed') and p.get('task_output_generated')})==9
assert len({p['work_id'] for p in rp if p.get('sample_generation_executed') and p.get('status')=='passed'})==6
assert sum(bool(p.get('sample_generation_executed')) and p.get('status')=='passed' for p in rp)==33
assert g['work_identity_groups'][0]['work_ids']==['work:P03','constraint040:work:PBFM']
assert g['followup_work_overlays']['work:P03']['followup_work_id']=='constraint040:work:PBFM'
assert not g['assessment_overlays']['physx039:work']['strict_constraint_evidence_established_from_Table2']
assert reg[:354]==read('provenance/parent_source_registry_0.9.39.json')['sources']
assert not constraint['submission_ready'] and not constraint['scientific_R4_pass'] and not constraint['industrial_pass']

manifest=read('PUBLIC_RELEASE_MANIFEST.json')
for f in manifest['protected_scientific_files']:assert sha(R/f['path'])==f['sha256'],f['path']
assert not manifest['submission_ready'] and not manifest['private_payloads_distributed']
print(json.dumps({'validation':'passed','graph_version':'0.9.40','audit_Work_nodes':95,'execution_records':89,'local_HTML_links_checked':True,'protected_scientific_files':len(manifest['protected_scientific_files']),'private_dependencies_required':False,'independent_scientific_validation':False,'submission_ready':False}))
