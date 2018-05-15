//GLOBAL OBJECTS SCENE ++++++++++++++++++++++++++++++++++++++++++++++++
float globalSceneHSDF(vec4 samplePoint, out vec4 lightIntensity, out int hitWhich){
  vec4 absoluteSamplePoint = samplePoint * cellBoost; // correct for the fact that we have been moving
  float distance = MAX_DIST;
  for(int i=0; i<4; i++){
    float objDist;
    if(lightIntensities[i].w == 0.0)
      objDist = MAX_DIST;
    else{
      objDist = sphereHSDF(absoluteSamplePoint, lightPositions[i], 1.0/(10.0*lightIntensities[i].w));
    }
    if(distance > objDist){
      hitWhich = 1;
      distance = objDist;
      lightIntensity = lightIntensities[i];
    }
  }
  for(int i=0; i<4; i++){
    float objDist;
    if(length(globalObjectRadii[i]) == 0.0)
      objDist = MAX_DIST;
    else{
      if(globalObjectTypes[i] == 0){ //sphere
        objDist = sphereHSDF(absoluteSamplePoint, globalObjectBoosts[i][3], globalObjectRadii[i].x);
      }
      /*else if(globalObjectTypes[i] == 1){ //cuboid
        vec4 dual0 = directionFrom2Points(globalObjectBoosts[i][3], globalObjectBoosts[i][3]*translateByVector(vec3(0.1,0.0,0.0)));
        vec4 dual1 = directionFrom2Points(globalObjectBoosts[i][3], globalObjectBoosts[i][3]*translateByVector(vec3(0.0,0.1,0.0)));
        vec4 dual2 = directionFrom2Points(globalObjectBoosts[i][3], globalObjectBoosts[i][3]*translateByVector(vec3(0.0,0.0,0.1)));
        objDist = geodesicCubeHSDF(absoluteSamplePoint, dual0, dual1, dual2, globalObjectRadii[i]);
      }*/
      else{ //not an object
        objDist = MAX_DIST;
      }
    }
    if(distance > objDist){
      hitWhich = 2;
      distance = objDist;
    }
  }
  return distance;
}

//NORMAL FUNCTIONS ++++++++++++++++++++++++++++++++++++++++++++++++++++
vec4 estimateNormal(vec4 p, int sceneType) { // normal vector is in tangent plane to hyperboloid at p
    // float denom = sqrt(1.0 + p.x*p.x + p.y*p.y + p.z*p.z);  // first, find basis for that tangent hyperplane
    vec4 throwAway = vec4(0.0);
    int throwAlso = 0;
    float newEp = EPSILON * 10.0;
    vec4 basis_x = lorentzNormalize(vec4(p.w,0.0,0.0,p.x));  // dw/dx = x/w on hyperboloid
    vec4 basis_y = vec4(0.0,p.w,0.0,p.y);  // dw/dy = y/denom
    vec4 basis_z = vec4(0.0,0.0,p.w,p.z);  // dw/dz = z/denom  /// note that these are not orthonormal!
    basis_y = lorentzNormalize(basis_y - lorentzDot(basis_y, basis_x)*basis_x); // need to Gram Schmidt
    basis_z = lorentzNormalize(basis_z - lorentzDot(basis_z, basis_x)*basis_x - lorentzDot(basis_z, basis_y)*basis_y);
    if(sceneType == 1 || sceneType == 2){ //global light scene
      float dist = globalSceneHSDF(p, throwAway, throwAlso);
      return lorentzNormalize( //p+EPSILON*basis_x should be lorentz normalized however it is close enough to be good enough
          basis_x * (globalSceneHSDF(p + newEp*basis_x, throwAway, throwAlso) - globalSceneHSDF(p - newEp*basis_x, throwAway, throwAlso)) +
          basis_y * (globalSceneHSDF(p + newEp*basis_y, throwAway, throwAlso) - globalSceneHSDF(p - newEp*basis_y, throwAway, throwAlso)) +
          basis_z * (globalSceneHSDF(p + newEp*basis_z, throwAway, throwAlso) - globalSceneHSDF(p - newEp*basis_z, throwAway, throwAlso))
      );
    }
    else{ //local scene
      return lorentzNormalize(
          basis_x * (localSceneHSDF(p + newEp*basis_x) - localSceneHSDF(p - newEp*basis_x)) +
          basis_y * (localSceneHSDF(p + newEp*basis_y) - localSceneHSDF(p - newEp*basis_y)) +
          basis_z * (localSceneHSDF(p + newEp*basis_z) - localSceneHSDF(p - newEp*basis_z))
      );
    }
  }

vec4 texcube(sampler2D tex, vec4 samplePoint, vec4 N, float k){
  vec3 p = mod(samplePoint.xyz,1.0);
  vec3 n = normalize(N.xyz); //Very hacky you are warned
  vec3 m = pow(abs(n), vec3(k));
  vec4 x = texture2D(tex, p.yz);
  vec4 y = texture2D(tex, p.zx);
  vec4 z = texture2D(tex, p.xy);
  return (x*m.x + y*m.y + z*m.z) / (m.x+m.y+m.z);
}


vec4 getRay(vec2 resolution, vec2 fragCoord){
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
     z = 0.1/tan(radians(fov*0.5));
     pPre = qtransform(cameraQuat, vec3(-xy,z));
  }
  vec4 p =  lorentzNormalize(vec4(pPre, 1.0));
  return p;
}

// This function is intended to be geometry-agnostic.
// We should update some of the variable names.
bool isOutsideCell(vec4 samplePoint, out mat4 fixMatrix){
  vec4 kleinSamplePoint = projectToKlein(samplePoint);
  if(kleinSamplePoint.x > halfCubeWidthKlein){
    fixMatrix = invGenerators[0];
    return true;
  }
  if(kleinSamplePoint.x < -halfCubeWidthKlein){
    fixMatrix = invGenerators[1];
    return true;
  }
  if(kleinSamplePoint.y > halfCubeWidthKlein){
    fixMatrix = invGenerators[2];
    return true;
  }
  if(kleinSamplePoint.y < -halfCubeWidthKlein){
    fixMatrix = invGenerators[3];
    return true;
  }
  if(kleinSamplePoint.z > halfCubeWidthKlein){
    fixMatrix = invGenerators[4];
    return true;
  }
  if(kleinSamplePoint.z < -halfCubeWidthKlein){
    fixMatrix = invGenerators[5];
    return true;
  }
  return false;
}

float raymarchDistance(vec4 rO, vec4 rD, out vec4 localEndPoint,
  out vec4 globalEndPoint, out vec4 localEndTangentVector, out vec4 globalEndTangentVector,
  out mat4 totalFixMatrix, out int hitWhich, out vec4 lightColor){
  lightColor = vec4(0.0);
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
      totalFixMatrix *= fixMatrix;
      vec4 newDirection = pointOnGeodesic(localrO, localrD, localDepth + 0.1); //forwards a bit
      localrO = lorentzNormalize(localSamplePoint*fixMatrix);
      newDirection = lorentzNormalize(newDirection*fixMatrix);
      localrD = directionFrom2Points(localrO,newDirection);
      localDepth = MIN_DIST;
    }
    else{
      float localDist = localSceneHSDF(localSamplePoint);
      float globalDist = globalSceneHSDF(globalSamplePoint, lightColor, hitWhich);
      float dist = min(localDist, globalDist);
      if(dist < EPSILON){
        if(localDist < globalDist){hitWhich = 3;}
        localEndPoint = localSamplePoint;
        globalEndPoint = globalSamplePoint;
        localEndTangentVector = tangentVectorOnGeodesic(localrO, localrD, localDepth); //move to outside raymarch distance
        globalEndTangentVector = tangentVectorOnGeodesic(rO, rD, globalDepth);
        return globalDepth;
      }
      globalDepth += dist;
      localDepth += dist;
      if(globalDepth >=MAX_DIST){
        hitWhich = 0;
        return MAX_DIST;
      }
    }
  }
  hitWhich = 0;
  return MAX_DIST;
}

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

vec3 phongModel(vec4 samplePoint, vec4 T, vec4 N, mat4 totalFixMatrix){
    float ambient = 0.02;
    //vec3 baseColor = vec3(0.0,1.0,1.0);
    vec3 baseColor = texcube(texture, samplePoint, N, 4.0).xyz;
    vec3 color = baseColor * ambient; //Setup up color with ambient component
   // vec4 tex = texture2D(texture, );
    for(int i = 0; i<8; i++){ //8 is the size of the lightPosition array
      if(lightIntensities[i] != vec4(0.0)){
        vec4 translatedLightPosition = lightPositions[i] * invCellBoost * totalFixMatrix;
        float distToLight = hypDistance(translatedLightPosition, samplePoint);
        float att;
        if(attnModel == 1) //Inverse Square
          att  = 1.0/ (0.01+lightIntensities[i].w * distToLight* distToLight);
        else if(attnModel == 2) //Linear
          att  = 0.75/ (0.01+lightIntensities[i].w * distToLight);      
        else if(attnModel == 3) //Physical
          att  = 1.0/ (0.01+lightIntensities[i].w*cosh(2.0*distToLight)-1.0);
        else //None
          att  = 0.25; //if its actually 1 everything gets washed out
        vec4 L = -directionFrom2Points(samplePoint, translatedLightPosition);
        vec4 R = 2.0*lorentzDot(L, N)*N - L;
        //Calculate Diffuse Component
        float nDotL = max(-lorentzDot(N, L),0.0);
        vec3 diffuse = lightIntensities[i].rgb * nDotL;
        //Calculate Specular Component
        float rDotT = max(lorentzDot(R, T),0.0);
        vec3 specular = lightIntensities[i].rgb * pow(rDotT,10.0);
        //Compute final color
        color += att*((diffuse*baseColor) + specular);
      }
    }
    return color;
}

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

void main(){
  vec4 globalLightColor;
  vec4 localEndPoint = vec4(0.0,0.0,0.0,1.0);
  vec4 globalEndPoint = vec4(0.0,0.0,0.0,1.0);
  vec4 localEndTangentVector = vec4(0.0,0.0,0.0,0.0);
  vec4 globalEndTangentVector = vec4(0.0,0.0,0.0,0.0);
  mat4 totalFixMatrix;
  vec4 rayOrigin = vec4(0.0,0.0,0.0,1.0);
  vec4 rayDirV = getRay(screenResolution, gl_FragCoord.xy);
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
    hitWhich, globalLightColor);

  //Based on hitWhich decide whether we hit a global object, local object, or nothing
  if(hitWhich == 0){ //Didn't hit anything ------------------------
    vec4 pointAtInfinity = pointOnGeodesicAtInfinity(rayOrigin, rayDirVPrime) * cellBoost;  //cellBoost corrects for the fact that we have been moving through cubes
    gl_FragColor = vec4(0.5*normalize(pointAtInfinity.xyz)+vec3(0.5,0.5,0.5),1.0);
    gl_FragColor = vec4(0.0); //better shows off lighting effects
    return;
  }
  else if(hitWhich == 1){ // global lights
    //vec4 N = estimateNormal(globalEndPoint, hitWhich);
    gl_FragColor = vec4(globalLightColor.rgb, 1.0);
    //float cameraLightMatteShade = -lorentzDot(surfaceNormal, globalEndTangentVector);
    //gl_FragColor = vec4(globalLightColor*cameraLightMatteShade,1.0);
    return;
  }
  else if(hitWhich == 2){ // global objects
    vec4 N = estimateNormal(globalEndPoint, hitWhich);
    vec3 color = phongModel(globalEndPoint, globalEndTangentVector, N,  mat4(1.0));
    gl_FragColor = vec4(color, 1.0);
    return;
  }
  else if(hitWhich == 3){ // local
    vec4 N = estimateNormal(localEndPoint, hitWhich);
    vec3 color = phongModel(localEndPoint, localEndTangentVector, N, totalFixMatrix);
    gl_FragColor = vec4(color, 1.0);
  }
}
