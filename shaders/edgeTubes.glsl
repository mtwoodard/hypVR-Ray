float localSceneSDF(vec4 samplePoint){
  if( useSimplex ) {
    vec4 s1 = simplexDualPoints[2];
    vec4 s2 = simplexDualPoints[3];
    vec4 dualPoint = geometryNormalize(s1 - geometryDot(s1, s2) * s2, true);
    return geodesicCylinderHSDFplanes(samplePoint, s2, dualPoint, tubeRad);
  }
  else {
    samplePoint = abs(samplePoint);
    // //now reflect until smallest xyz coord is z, and largest is x
    if(samplePoint.x < samplePoint.z){
      samplePoint = vec4(samplePoint.z,samplePoint.y,samplePoint.x,samplePoint.w);
    }
    if(samplePoint.y < samplePoint.z){
      samplePoint = vec4(samplePoint.x,samplePoint.z,samplePoint.y,samplePoint.w);
    }
    if(samplePoint.x < samplePoint.y){
      samplePoint = vec4(samplePoint.y,samplePoint.x,samplePoint.z,samplePoint.w);
    }
    // should precompute these orthonomal calculations
    vec4 dualPoint1 = geometryNormalize(halfCubeDualPoints[1] - geometryDot(halfCubeDualPoints[1], halfCubeDualPoints[0]) * halfCubeDualPoints[0], true);
    float edgesDistance = geodesicCylinderHSDFplanes(samplePoint, halfCubeDualPoints[0], dualPoint1, tubeRad);
    return edgesDistance;
  }
}