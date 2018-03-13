vec4 getRay(float fov, vec2 resolution, vec2 fragCoord){
  vec2 xy = 0.2*((fragCoord - 0.5*resolution)/resolution.x);
  float z = 0.1;
  vec3 pPre = qtransform(cameraQuat, vec3(-xy,z));
  vec4 p = lorentzNormalize(vec4(pPre, 1.0));
  return p;
}

float raymarchDistance(vec4 rO, vec4 rD, float start, float end, out vec4 localEndPoint, 
  out vec4 globalEndPoint, out vec4 localEndTangentVector, out vec4 globalEndTangentVector, 
  out mat4 totalFixMatrix, out float tilingSteps, out int hitWhich){
  int fakeI = 0;
  float globalDepth = start;
  float localDepth = globalDepth;
  mat4 fixMatrix;
  vec4 localrO = rO;
  vec4 localrD = rD;
  totalFixMatrix = mat4(1.0);  // out variables start undeclared in the function
  for(int i = 0; i< MAX_MARCHING_STEPS; i++){
    if(fakeI >= maxSteps){
      //when we break its as if we reached our max marching steps
      break;
    }
    fakeI++;
    vec4 localSamplePoint = pointOnGeodesic(localrO, localrD, localDepth);
    vec4 globalSamplePoint = pointOnGeodesic(rO, rD, globalDepth);
    if(isOutsideCell(localSamplePoint, fixMatrix)){
      tilingSteps++;
      totalFixMatrix *= fixMatrix;
      vec4 newDirection = pointOnGeodesic(localrO, localrD, localDepth + 0.1); //forwards a bit
      localrO = localSamplePoint*fixMatrix;
      newDirection *= fixMatrix;
      localrO = lorentzNormalize(localrO);
      newDirection = lorentzNormalize(newDirection);
      localrD = directionFrom2Points(localrO,newDirection);
      localDepth = start;
    }
    else{
      float localDist = localSceneHSDF(localSamplePoint);
      float globalDist = globalSceneHSDF(globalSamplePoint);
      float dist = min(localDist, globalDist);
      // float dist = localDist;
      if(dist < EPSILON){
        if (localDist < globalDist){hitWhich = 1;}
        else{hitWhich = 2;}
        localEndPoint = localSamplePoint;
        globalEndPoint = globalSamplePoint;
        localEndTangentVector = tangentVectorOnGeodesic(localrO, localrD, localDepth);
        globalEndTangentVector = tangentVectorOnGeodesic(rO, rD, globalDepth);
        return globalDepth;
      }
      globalDepth += dist;
      localDepth += dist;
      if(globalDepth >= end){
        hitWhich = 0;
        globalEndPoint = pointOnGeodesic(localrO, localrD, localDepth);
        localEndTangentVector = tangentVectorOnGeodesic(localrO, localrD, localDepth);
        globalEndTangentVector = tangentVectorOnGeodesic(rO, rD, globalDepth);
        return end;
      }
    }
  }
  hitWhich = 0;
  globalEndPoint = pointOnGeodesicAtInfinity(localrO, localrD);
  localEndTangentVector = tangentVectorOnGeodesic(localrO, localrD, localDepth);
  globalEndTangentVector = tangentVectorOnGeodesic(rO, rD, globalDepth);

  return end;
}

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

void main(){
  vec4 localEndPoint = vec4(0.0,0.0,0.0,1.0);
  vec4 globalEndPoint = vec4(0.0,0.0,0.0,1.0);
  vec4 localEndTangentVector = vec4(0.0,0.0,0.0,0.0);
  vec4 globalEndTangentVector = vec4(0.0,0.0,0.0,0.0);
  mat4 totalFixMatrix;
  float tilingSteps = 1.0;
  vec4 rayOrigin = vec4(0.0,0.0,0.0,1.0);
  int hitWhich = 0; // 0 means nothing, 1 means local, 2 means global object
  //camera position must be translated in hyperboloid ------------------------
  //rayOrigin *= translateByVector(cameraPos);
  rayOrigin *= currentBoost;
  //generate direction then transform to hyperboloid ------------------------
  vec4 rayDirV = getRay(90.0, screenResolution, gl_FragCoord.xy);
  //rayDirV *= translateByVector(cameraPos);
  rayDirV *= currentBoost;
  vec4 rayDirVPrime = directionFrom2Points(rayOrigin, rayDirV);
  //get our raymarched distance back ------------------------
  float dist = raymarchDistance(rayOrigin, rayDirVPrime, MIN_DIST, MAX_DIST, localEndPoint, 
    globalEndPoint, localEndTangentVector, globalEndTangentVector, totalFixMatrix, 
    tilingSteps, hitWhich);
  if(hitWhich == 0){ //Didn't hit anything ------------------------
    vec4 pointAtInfinity = pointOnGeodesicAtInfinity(rayOrigin, rayDirVPrime) * cellBoost;  //cellBoost corrects for the fact that we have been moving through cubes
    gl_FragColor = vec4(0.5*normalize(pointAtInfinity.xyz)+vec3(0.5,0.5,0.5),1.0);
    return;
  }
  else if(hitWhich == 2){ // global
    vec4 surfaceNormal = globalEstimateNormal(globalEndPoint);
    float shineShade = lorentzDot(surfaceNormal, globalEndTangentVector);
    gl_FragColor = vec4(shineShade,0.0,0.0,1.0);
    return;
  }
  else if(hitWhich == 1){ // local
    vec4 localSurfaceNormal = localEstimateNormal(localEndPoint);
    vec4 translatedLightSourcePosition = lightSourcePosition * invCellBoost * totalFixMatrix;
    vec4 directionToLightSource = -directionFrom2Points(localEndPoint, translatedLightSourcePosition);

    // float shineShade = lorentzDot(localSurfaceNormal, localEndTangentVector);
    float shineShade = lorentzDot(localSurfaceNormal, directionToLightSource);
    
    float depthShade = max(1.0-dist/5.0, 0.0);
    float stepsShade = max(1.0-tilingSteps/3.0,0.0);
    // float comboShade = shineShade*depthShade;
    vec4 depthColor = vec4(depthShade,depthShade*0.65,0.1,1.0);
    // vec4 stepsColor = vec4(stepsShade,stepsShade,stepsShade,1.0);
    vec4 shineColor = vec4(shineShade,shineShade,shineShade,1.0);
    // vec4 comboColor = vec4(comboShade,comboShade,comboShade,1.0);
    // vec4 orange = vec4(1.0,0.65,0.1,1.0);
    // vec4 white = vec4(1.0,1.0,1.0,1.0);
    // vec4 normalColor = vec4(abs(normalize(projectToKlein(surfaceNormal).xyz)),1.0);
    //abs is needed to avoid inconsistencies in shading coming from different paths
    // vec4 endRayColor = vec4((normalize(projectToKlein(endRayTangentVector).xyz)),1.0);
    //to the same cube giving different orientations of the cube

    // gl_FragColor = 0.85 * depthColor + 0.15 * normalColor;
    // if(comboShade < 0.5){
    //   gl_FragColor = 2.0 * comboShade * orange;
    // }
    // else{
    //   gl_FragColor = 2.0*(comboShade-0.5)*white + (1.0 - 2.0*(comboShade-0.5))*orange;
    // }
    gl_FragColor = 0.5*depthColor + 0.5*shineColor;
    // gl_FragColor = shineColor;
    // gl_FragColor = 0.2*stepsColor + 0.8*normalColor;
    // gl_FragColor = normalColor;
    // gl_FragColor = endRayColor;
  }
}
