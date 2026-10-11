"""Track public GitHub repository revisions without modifying scientific coding."""
from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
GRAPH=ROOT/'service/data/knowledge_graph.json'
OUTPUT=ROOT/'runs/wp1/public_artifact_revision_watch.json'
SERVICE_OUTPUT=ROOT/'service/data/public_artifact_revision_watch.json'
API='https://api.github.com'


def repo_slug(raw: str) -> str | None:
    if not raw:
        return None
    u=urlparse(raw if '://' in raw else 'https://'+raw)
    if u.netloc.lower().removeprefix('www.')!='github.com':
        return None
    parts=[x for x in u.path.strip('/').split('/') if x]
    if len(parts)<2:
        return None
    owner,name=parts[:2]
    name=re.sub(r'\.git$','',name,flags=re.I)
    if not re.fullmatch(r'[A-Za-z0-9_.-]+',owner) or not re.fullmatch(r'[A-Za-z0-9_.-]+',name):
        return None
    return f'{owner}/{name}'


def api_get(path: str, token: str | None, attempts: int=3) -> dict:
    headers={'Accept':'application/vnd.github+json','User-Agent':'manufacturing-synthesis-evidence-graph/1.0','X-GitHub-Api-Version':'2022-11-28'}
    if token:
        headers['Authorization']=f'Bearer {token}'
    last='unknown_error'
    for i in range(attempts):
        try:
            req=Request(f'{API}{path}',headers=headers)
            with urlopen(req,timeout=20) as response:
                if response.status != 200:
                    raise RuntimeError(f'http_{response.status}')
                return json.loads(response.read().decode('utf-8'))
        except HTTPError as e:
            last=f'http_{e.code}'
            if e.code not in (403,429,500,502,503,504):
                break
        except (URLError,TimeoutError,ValueError,RuntimeError) as e:
            last=type(e).__name__
        if i+1<attempts:
            time.sleep(1.5*(i+1))
    raise RuntimeError(last)


def main() -> int:
    graph=json.loads(GRAPH.read_text(encoding='utf-8'))
    previous=json.loads(OUTPUT.read_text(encoding='utf-8')) if OUTPUT.exists() else {'items':[]}
    old={x['repository']:x for x in previous.get('items',[]) if x.get('repository')}
    found={}
    for node in graph['nodes']:
        if node.get('type')!='Work':
            continue
        p=node.get('properties',{})
        slug=repo_slug(p.get('repository_url',''))
        if not slug:
            continue
        entry=found.setdefault(slug,{'repository':slug,'url':f'https://github.com/{slug}','work_ids':[],'work_labels':[]})
        entry['work_ids'].append(node['id'])
        entry['work_labels'].append(node.get('label',''))

    token=os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    items=[]; changes=[]
    now=datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')
    for slug,entry in sorted(found.items()):
        before=old.get(slug,{})
        try:
            meta=api_get(f'/repos/{slug}',token)
            branch=meta.get('default_branch')
            if not branch:
                raise RuntimeError('default_branch_missing')
            commit=api_get(f'/repos/{slug}/commits/{branch}',token)
            sha=commit.get('sha')
            if not sha:
                raise RuntimeError('head_sha_missing')
            status='available'
            item={**entry,'checked_at':now,'status':status,'default_branch':branch,'head_sha':sha,
                  'commit_date':commit.get('commit',{}).get('committer',{}).get('date'),
                  'archived':bool(meta.get('archived')),'license_spdx':(meta.get('license') or {}).get('spdx_id'),
                  'previous_head_sha':before.get('head_sha'),'revision_changed':bool(before.get('head_sha') and before.get('head_sha')!=sha)}
            if item['revision_changed']:
                changes.append({'repository':slug,'from':before.get('head_sha'),'to':sha,'work_ids':entry['work_ids']})
        except Exception as e:  # preserve failed checks as monitoring evidence, never as availability loss proof
            item={**entry,'checked_at':now,'status':'check_failed','error_class':str(e),
                  'default_branch':before.get('default_branch'),'head_sha':before.get('head_sha'),
                  'previous_head_sha':before.get('head_sha'),'revision_changed':False,
                  'note':'Transient/auth/rate-limit failures are not evidence that a repository is absent.'}
        items.append(item)

    payload={
        'schema_version':'1.0','watch_status':'active','as_of':now,'monitor_scope':'GitHub repository revision/availability metadata only; no code, model, data, license, or scientific claim is automatically reclassified.',
        'graph_version':graph.get('graph_version'),'graph_as_of':graph.get('as_of'),
        'unique_github_repositories':len(items),'available_n':sum(x['status']=='available' for x in items),
        'check_failed_n':sum(x['status']!='available' for x in items),'revision_changes_n':len(changes),
        'revision_changes':changes,'items':items,
        'limitations':['Repository URL and default-branch commit do not prove required model/data assets are available or licensed for a use.',
                       'A failed API check is transient/ambiguous and is not coded as repository deletion.',
                       'Changed revisions require a human evidence and rights review before updating paper-level claims.',
                       'This monitor does not discover new papers or perform AI eligibility screening.']}
    serialized=json.dumps(payload,ensure_ascii=False,indent=2)+'\n'
    OUTPUT.write_text(serialized,encoding='utf-8')
    SERVICE_OUTPUT.write_text(serialized,encoding='utf-8')
    print(json.dumps({k:v for k,v in payload.items() if k not in {'items','limitations','revision_changes'}},ensure_ascii=False))
    return 0


if __name__=='__main__':
    sys.exit(main())
