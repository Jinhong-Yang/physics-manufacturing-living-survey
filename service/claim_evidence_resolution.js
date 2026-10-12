(function(root){
 'use strict';
 function spans(graph,claim,historical){
  const q=graph.claim_evidence_resolution_overlays?.[claim.id];
  if(!q)return historical;
  return q.reviewed_span_ids.map(id=>graph.nodes.find(n=>n.id===id&&n.type==='EvidenceSpan')).filter(Boolean);
 }
 function text(graph,claim){return graph.claim_evidence_resolution_overlays?.[claim?.id]?.display_claim_text||claim?.properties.text||'';}
 const api={spans,text};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ClaimEvidenceResolution=api;
})(typeof window!=='undefined'?window:globalThis);
