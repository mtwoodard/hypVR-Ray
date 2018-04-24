//NORMAL FUNCTIONS ++++++++++++++++++++++++++++++++++++++++++++++++++++
vec4 estimateNormal(vec4 p, int sceneType) { // normal vector is in tangent plane to hyperboloid at p
    // float denom = sqrt(1.0 + p.x*p.x + p.y*p.y + p.z*p.z);  // first, find basis for that tangent hyperplane
    vec3 throwAway = vec3(0.0);
    vec4 basis_x = lorentzNormalize(vec4(p.w,0.0,0.0,p.x));  // dw/dx = x/w on hyperboloid
    vec4 basis_y = vec4(0.0,p.w,0.0,p.y);  // dw/dy = y/denom
    vec4 basis_z = vec4(0.0,0.0,p.w,p.z);  // dw/dz = z/denom  /// note that these are not orthonormal!
    basis_y = lorentzNormalize(basis_y - lorentzDot(basis_y, basis_x)*basis_x); // need to Gram Schmidt
    basis_z = lorentzNormalize(basis_z - lorentzDot(basis_z, basis_x)*basis_x - lorentzDot(basis_z, basis_y)*basis_y);
    // float HSDFp = localSceneHSDF(p);
    if(sceneType == 1){ //global scene
      return lorentzNormalize(
          // basis_x * (globalSceneHSDF(lorentzNormalize(p + 2.0*EPSILON*basis_x)) - HSDFp) +
          // basis_y * (globalSceneHSDF(lorentzNormalize(p + 2.0*EPSILON*basis_y)) - HSDFp) +
          // basis_z * (globalSceneHSDF(lorentzNormalize(p + 2.0*EPSILON*basis_z)) - HSDFp)
          basis_x * (globalSceneHSDF(lorentzNormalize(p + EPSILON*basis_x), throwAway) - globalSceneHSDF(lorentzNormalize(p - EPSILON*basis_x), throwAway)) +
          basis_y * (globalSceneHSDF(lorentzNormalize(p + EPSILON*basis_y), throwAway) - globalSceneHSDF(lorentzNormalize(p - EPSILON*basis_y), throwAway)) +
          basis_z * (globalSceneHSDF(lorentzNormalize(p + EPSILON*basis_z), throwAway) - globalSceneHSDF(lorentzNormalize(p - EPSILON*basis_z), throwAway))
      );
    }
    else{ //local scene
      return lorentzNormalize(
          // basis_x * (localSceneHSDF(lorentzNormalize(p + 2.0*EPSILON*basis_x)) - HSDFp) +
          // basis_y * (localSceneHSDF(lorentzNormalize(p + 2.0*EPSILON*basis_y)) - HSDFp) +
          // basis_z * (localSceneHSDF(lorentzNormalize(p + 2.0*EPSILON*basis_z)) - HSDFp)
          basis_x * (localSceneHSDF(lorentzNormalize(p + EPSILON*basis_x)) - localSceneHSDF(lorentzNormalize(p - EPSILON*basis_x))) +
          basis_y * (localSceneHSDF(lorentzNormalize(p + EPSILON*basis_y)) - localSceneHSDF(lorentzNormalize(p - EPSILON*basis_y))) +
          basis_z * (localSceneHSDF(lorentzNormalize(p + EPSILON*basis_z)) - localSceneHSDF(lorentzNormalize(p - EPSILON*basis_z)))
      );

    }
  }

vec4 getRay(float fov, vec2 resolution, vec2 fragCoord){
  if(isStereo != 0){
    resolution.x = resolution.x/2.0;
  }
  if(isStereo == 1){
    fragCoord.x = fragCoord.x - resolution.x;
  }
  vec2 xy = 0.2*((fragCoord - 0.5*resolution)/resolution.x);
  float z = 0.1;
  vec3 pPre;
  vec3 pPrePre;
  //pPrePre = qtransform(leftEyeRotation, vec3(-xy,z));
  //pPre = qtransform(cameraQuat, pPrePre);
  if(isStereo != 0){
    if(isStereo == -1){
       pPrePre = qtransform(leftEyeRotation, vec3(-xy,z));
    }
    else{
       pPrePre = qtransform(rightEyeRotation, vec3(-xy,z));
    }
     pPre = qtransform(cameraQuat, pPrePre);
  }
  else{
     pPre = qtransform(cameraQuat, vec3(-xy,z));
  }
  vec4 p = lorentzNormalize(vec4(pPre, 1.0));
  return p;
}

float raymarchDistance(vec4 rO, vec4 rD, out vec4 localEndPoint,
  out vec4 globalEndPoint, out vec4 localEndTangentVector, out vec4 globalEndTangentVector,
  out mat4 totalFixMatrix, out float tilingSteps, out int hitWhich, out vec3 lightColor){
  lightColor = vec3(0.0);
  int fakeI = 0;
  float globalDepth = MIN_DIST;
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
      localDepth = MIN_DIST;
    }
    else{
      float localDist = localSceneHSDF(localSamplePoint);
      float globalDist = globalSceneHSDF(globalSamplePoint, globalLightColor);
      float dist = min(localDist, globalDist);
      // float dist = localDist;
      if(dist < EPSILON){
        if (localDist < globalDist){hitWhich = 2;}
        else{hitWhich = 1;}
        localEndPoint = localSamplePoint;
        globalEndPoint = globalSamplePoint;
        localEndTangentVector = tangentVectorOnGeodesic(localrO, localrD, localDepth);
        globalEndTangentVector = tangentVectorOnGeodesic(rO, rD, globalDepth);
        return globalDepth;
      }
      globalDepth += dist;
      localDepth += dist;
      if(globalDepth >=MAX_DIST){
        hitWhich = 0;
        globalEndPoint = pointOnGeodesic(localrO, localrD, localDepth);
        localEndTangentVector = tangentVectorOnGeodesic(localrO, localrD, localDepth);
        globalEndTangentVector = tangentVectorOnGeodesic(rO, rD, globalDepth);
        return MAX_DIST;
      }
    }
  }
  hitWhich = 0;
  globalEndPoint = pointOnGeodesicAtInfinity(localrO, localrD);
  localEndTangentVector = tangentVectorOnGeodesic(localrO, localrD, localDepth);
  globalEndTangentVector = tangentVectorOnGeodesic(rO, rD, globalDepth);

  return MAX_DIST;
}

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

void main(){
  vec3 globalLightColor;
  vec4 localEndPoint = vec4(0.0,0.0,0.0,1.0);
  vec4 globalEndPoint = vec4(0.0,0.0,0.0,1.0);
  vec4 localEndTangentVector = vec4(0.0,0.0,0.0,0.0);
  vec4 globalEndTangentVector = vec4(0.0,0.0,0.0,0.0);
  mat4 totalFixMatrix;
  float tilingSteps = 1.0;
  vec4 rayOrigin = vec4(0.0,0.0,0.0,1.0);
  vec4 rayDirV = getRay(90.0, screenResolution, gl_FragCoord.xy);
  int hitWhich = 0; // 0 means nothing, 1 means local, 2 means global object
  //camera position must be translated in hyperboloid ------------------------
  if(isStereo != 0){ //move left or right for stereo
    if(isStereo == -1){
      rayOrigin *= leftCurrentBoost;
      rayDirV *= leftCurrentBoost;
    }
    else{
      rayOrigin *= rightCurrentBoost;
      rayDirV *= rightCurrentBoost;
    }
  }
  rayOrigin *= currentBoost;
  rayDirV *= currentBoost;
  //generate direction then transform to hyperboloid ------------------------
  vec4 rayDirVPrime = directionFrom2Points(rayOrigin, rayDirV);
  //get our raymarched distance back ------------------------
  float dist = raymarchDistance(rayOrigin, rayDirVPrime, localEndPoint,
    globalEndPoint, localEndTangentVector, globalEndTangentVector, totalFixMatrix,
    tilingSteps, hitWhich, globalLightColor);

  //Based on hitWhich decide whether we hit a global object, local object, or nothing
  if(hitWhich == 0){ //Didn't hit anything ------------------------
    vec4 pointAtInfinity = pointOnGeodesicAtInfinity(rayOrigin, rayDirVPrime) * cellBoost;  //cellBoost corrects for the fact that we have been moving through cubes
    gl_FragColor = vec4(0.5*normalize(pointAtInfinity.xyz)+vec3(0.5,0.5,0.5),1.0);
    return;
  }
  else if(hitWhich == 1){ // global
    vec4 surfaceNormal = estimateNormal(globalEndPoint, hitWhich);
    float cameraLightMatteShade = -lorentzDot(surfaceNormal, globalEndTangentVector);
    gl_FragColor = vec4(globalLightColor,1.0);
    return;
  }
  else if(hitWhich == 2){ // local
    vec4 N = estimateNormal(localEndPoint, hitWhich);
    vec3 color = vec3(0.1); //Setup up color with ambient component
    for(int i = 0; i<8; i++){ //8 is the size of the lightSourcePosition array
      if(lightIntensities[i] != vec3(0.0)){
        vec4 translatedLightPosition = lightPositions[i] * invCellBoost * totalFixMatrix;
        vec4 L = -directionFrom2Points(localEndPoint, translatedLightPosition);
        vec4 R = 2.0*lorentzDot(L, N)*N - L;
        //Calculate Diffuse Component
        float nDotL = max(-lorentzDot(N, L),0.0);
        vec3 diffuse = lightIntensities[i] * nDotL;
        //Calculate Specular Component
        float rDotTV = max(lorentzDot(R, localEndTangentVector),0.0);
        vec3 specular = lightIntensities[i] * pow(rDotTV,10.0);
        //Compute final color
        color += (diffuse + specular);
      }
    }

    if (lightingModel == 1)
    {
      gl_FragColor = vec4(color, 1.0);
    }
    else // lightingModel = 0
    {
      gl_FragColor = vec4(0.5,0.0,0.0,1.0);
    }
  }
}
