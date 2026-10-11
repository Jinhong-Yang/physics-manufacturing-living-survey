'use strict';
Promise.all(['data/taccel_dependency_pair.json','data/taccel_build_followup.json'].map(async path=>{
  const response=await fetch(path);if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();
})).then(([pair,build])=>{
  for(const [id,name] of [['original','original_py310'],['adapted','adapted_py310']]){
    const result=pair.variants.find(x=>x.variant===name).result;
    document.getElementById(id).textContent=`${result.passed_case_count}/${result.case_count}`;
  }
  document.getElementById('industry').textContent=build.industrial_pass?'통과':'미검증';
  document.getElementById('build').textContent=build.compiled_libraries.length===2?'라이브러리 2개 생성':'근거 확인 필요';
  document.getElementById('imports').textContent=`${build.core_imports_after_dependency.passed}/${build.core_imports_after_dependency.total} 정상 로딩`;
  document.getElementById('kernels').textContent=`${build.native_warp_gpu_cases.passed}/${build.native_warp_gpu_cases.total} 수치 비교 통과`;
}).catch(()=>{document.getElementById('error').textContent='근거를 불러오지 못했습니다. 연결된 JSON 파일을 확인하세요.';});
