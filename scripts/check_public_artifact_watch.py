"""Validate weekly public-repository metadata snapshots without inferring scientific status."""
import json
import re
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from monitor_public_artifact_revisions import repo_slug

assert repo_slug('https://github.com/Ldhlwh/DFMGAN')=='Ldhlwh/DFMGAN'
assert repo_slug('https://github.com/owner/repo/tree/main/code')=='owner/repo'
assert repo_slug('https://github.com/owner/repo.git')=='owner/repo'
assert repo_slug('https://huggingface.co/org/model') is None

snapshot=ROOT/'runs/wp1/public_artifact_revision_watch.json'
if snapshot.exists():
    data=json.loads(snapshot.read_text(encoding='utf-8'))
    items=data['items']
    repos=[x['repository'] for x in items]
    assert repos==sorted(set(repos))
    assert data['unique_github_repositories']==len(items)
    assert data['available_n']==sum(x['status']=='available' for x in items)
    assert data['check_failed_n']==sum(x['status']!='available' for x in items)
    assert data['revision_changes_n']==len(data['revision_changes'])
    assert data['watch_status'] in {'active','not_started'}
    assert all(x['status'] in {'available','check_failed'} for x in items)
    assert all(re.fullmatch(r'[0-9a-f]{40}',x['head_sha']) for x in items if x['status']=='available')
    assert 'do not prove' in data['limitations'][0]
    public_copy=ROOT/'service/data/public_artifact_revision_watch.json'
    assert public_copy.exists() and json.loads(public_copy.read_text(encoding='utf-8'))==data
print('PASS public artifact watch: URL normalization and snapshot invariants; metadata does not certify runnable code, license, physics, or industrial readiness.')

