//GLOBAL OBJECTS SCENE ++++++++++++++++++++++++++++++++++++++++++++++++
float globalSceneSDF(vec4 samplePoint, out int hitWhich){
  vec4 absoluteSamplePoint = samplePoint * cellBoost; // correct for the fact that we have been moving
  float distance = MAX_DIST;
  //PASS FOR LIGHT OBJECTS
  for(int i=0; i<6; i++){
    float objDist;
    if(i>3+controllerCount) //If no controllers are present exit for loop
     break;
    else if(i>3){
      //controllerBoost should be an offset value from headset
      objDist = sphereSDF(absoluteSamplePoint, ORIGIN*controllerBoosts[i-4]*currentBoost, 1.0/(10.0 * lightIntensities[i].w));
     //objDist = geodesicCubeHSDF(absoluteSamplePoint, controllerDualPoints[(i-4) * 3],  controllerDualPoints[(i-4) * 3 + 1],  controllerDualPoints[(i-4) * 3 + 2], vec3(0.2, 0.2, 0.2));
      if(distance > objDist){
        hitWhich = 1;
        distance = objDist;
        globalLightColor = lightIntensities[i];
      }
    }
    else{
      if(lightIntensities[i].w == 0.0) objDist = MAX_DIST;
      else objDist = sphereSDF(absoluteSamplePoint, lightPositions[i], 1.0/(10.0*lightIntensities[i].w));
      if(distance > objDist){
        hitWhich = 1;
        distance = objDist;
        globalLightColor = lightIntensities[i];
      }
    }
  }
  for(int i=0; i<4; i++){
    float objDist;
    if(length(globalObjectRadii[i]) == 0.0)
      objDist = MAX_DIST;
    else{
      if(globalObjectTypes[i] == 0){ //sphere
        objDist = sphereSDF(absoluteSamplePoint, globalObjectBoosts[i][3], globalObjectRadii[i].x);
      }
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
vec4 estimateNormal(vec4 p, int sceneType) { // normal vector is in tangent hyperplane to hyperboloid at p
    // float denom = sqrt(1.0 + p.x*p.x + p.y*p.y + p.z*p.z);  // first, find basis for that tangent hyperplane
    vec4 throwAway = vec4(0.0);
    int throwAlso = 0;
    float newEp = EPSILON * 10.0;
    vec4 basis_x = geometryNormalize(vec4(p.w,0.0,0.0,p.x), true);  // dw/dx = x/w on hyperboloid
    vec4 basis_y = vec4(0.0,p.w,0.0,p.y);  // dw/dy = y/denom
    vec4 basis_z = vec4(0.0,0.0,p.w,p.z);  // dw/dz = z/denom  /// note that these are not orthonormal!
    basis_y = geometryNormalize(basis_y - geometryDot(basis_y, basis_x)*basis_x, true); // need to Gram Schmidt
    basis_z = geometryNormalize(basis_z - geometryDot(basis_z, basis_x)*basis_x - geometryDot(basis_z, basis_y)*basis_y, true);
    if(sceneType == 1 || sceneType == 2){ //global light scene
      return geometryNormalize( //p+EPSILON*basis_x should be lorentz normalized however it is close enough to be good enough
          basis_x * (globalSceneSDF(p + newEp*basis_x, throwAlso) - globalSceneSDF(p - newEp*basis_x, throwAlso)) +
          basis_y * (globalSceneSDF(p + newEp*basis_y, throwAlso) - globalSceneSDF(p - newEp*basis_y, throwAlso)) +
          basis_z * (globalSceneSDF(p + newEp*basis_z, throwAlso) - globalSceneSDF(p - newEp*basis_z, throwAlso)),
          true
      );
    }
    else{ //local scene
      return geometryNormalize(
          basis_x * (localSceneSDF(p + newEp*basis_x) - localSceneSDF(p - newEp*basis_x)) +
          basis_y * (localSceneSDF(p + newEp*basis_y) - localSceneSDF(p - newEp*basis_y)) +
          basis_z * (localSceneSDF(p + newEp*basis_z) - localSceneSDF(p - newEp*basis_z)),
          true
      );
    }
  }

vec4 getRayPoint(vec2 resolution, vec2 fragCoord){ //creates a point that our ray will go through
  if(isStereo != 0){
    resolution.x = resolution.x/2.0;
  }
  if(isStereo == 1){
    fragCoord.x = fragCoord.x - resolution.x;
  }
  vec2 xy = 0.2*((fragCoord - 0.5*resolution)/resolution.x);
  float z = 0.1/tan(radians(fov*0.5));
  vec4 p =  geometryNormalize(vec4(xy,-z,1.0), false);
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
  out vec4 localEndTangentVector, out vec4 globalEndTangentVector,
  out mat4 totalFixMatrix, out int hitWhich){
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
    vec4 globalEndPoint = pointOnGeodesic(rO, rD, globalDepth);
    if(isOutsideCell(localSamplePoint, fixMatrix)){
      totalFixMatrix *= fixMatrix;
      vec4 newDirectionPoint = pointOnGeodesic(localrO, localrD, localDepth + 0.1); //forwards a bit
      localrO = geometryNormalize(localSamplePoint*fixMatrix, false);
      newDirectionPoint = geometryNormalize(newDirectionPoint*fixMatrix, false);
      localrD = geometryDirection(localrO,newDirectionPoint);
      localDepth = MIN_DIST;
    }
    else{
      float localDist = localSceneSDF(localSamplePoint);
      float globalDist = globalSceneSDF(globalEndPoint, hitWhich);
      float dist = min(localDist, globalDist);
      if(dist < EPSILON){
        if(localDist < globalDist){hitWhich = 3;}
        localEndPoint = localSamplePoint;
        globalSamplePoint = globalEndPoint;
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

void main(){
  vec4 localEndPoint = vec4(0.0,0.0,0.0,1.0);
  vec4 localEndTangentVector = vec4(0.0,0.0,0.0,0.0);
  vec4 globalEndTangentVector = vec4(0.0,0.0,0.0,0.0);
  mat4 totalFixMatrix;
  vec4 rayOrigin = ORIGIN;
  vec4 rayDirV = getRayPoint(screenResolution, gl_FragCoord.xy);
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
  vec4 rayDirVPrime = geometryDirection(rayOrigin, rayDirV);
  //get our raymarched distance back ------------------------
  float dist = raymarchDistance(rayOrigin, rayDirVPrime, localEndPoint,
    localEndTangentVector, globalEndTangentVector, totalFixMatrix,
    hitWhich);

  //Based on hitWhich decide whether we hit a global object, local object, or nothing
  if(hitWhich == 0){ //Didn't hit anything ------------------------
    gl_FragColor = vec4(0.0);
    gl_FragColor = ORIGIN * controllerBoosts[0];
    return;
  }
  else if(hitWhich == 1){ // global lights
    gl_FragColor = vec4(globalLightColor.rgb, 1.0);
    return;
  }
  else if(hitWhich == 2){ // global objects
    vec4 N = estimateNormal(globalSamplePoint, hitWhich);
    vec3 color = phongModel(globalSamplePoint, globalEndTangentVector, N,  mat4(1.0), invGlobalObjectBoosts[0], true);
    gl_FragColor = vec4(color, 1.0);
    return;
  }
  else if(hitWhich == 3){ // local
    vec4 N = estimateNormal(localEndPoint, hitWhich);
    vec3 color = phongModel(localEndPoint, localEndTangentVector, N, totalFixMatrix, mat4(1.0), false);
    gl_FragColor = vec4(color, 1.0);
  }
}
