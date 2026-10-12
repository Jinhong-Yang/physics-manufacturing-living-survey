(function(root){
 'use strict';
 function resolve(graph,span){
  const current=graph.source_reference_resolution_overlays?.[span.span_id||span.id];
  if(!current)return span;
  return {...span,historical_source_id:span.source_id,historical_source_url:span.source_url,source_id:current.resolved_source_id,source_url:current.resolved_source_url,reference_resolution_scope:current.resolution_basis};
 }
 const api={resolve};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SourceReferenceResolution=api;
})(typeof window!=='undefined'?window:globalThis);
