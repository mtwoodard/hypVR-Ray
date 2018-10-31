//GLOBAL OBJECTS SCENE ++++++++++++++++++++++++++++++++++++++++++++++++
float globalSceneSDF(vec4 samplePoint){
  vec4 absoluteSamplePoint = samplePoint * cellBoost; // correct for the fact that we have been moving
  float distance = maxDist;
  //Light Objects
  for(int i=0; i<NUM_LIGHTS; i++){
    float objDist;
    if(lightIntensities[i].w == 0.0) { objDist = maxDist; }
    else{
      objDist = sphereSDF(absoluteSamplePoint, lightPositions[i], 1.0/(10.0*lightIntensities[i].w));
      distance = min(distance, objDist);
      if(distance < EPSILON){
        hitWhich = 1;
        globalLightColor = lightIntensities[i];
        return distance;
      }
    }
  }
  //Controller Objects
  for(int i=0; i<2; i++){
    if(controllerCount != 0){
      //float objDist = sphereSDF(absoluteSamplePoint, ORIGIN*controllerBoosts[i-4]*currentBoost, 1.0/(10.0 * lightIntensities[i].w));
      float objDist = controllerSDF(absoluteSamplePoint, controllerBoosts[i-4]*currentBoost, 1.0/(10.0 * lightIntensities[i].w));
      distance = min(distance, objDist);
      if(distance < EPSILON){
        hitWhich = 1;
        globalLightColor = lightIntensities[i+4];
        return distance;
      }
      if(controllerCount == 1) break;
    }
  }
  //Global Objects
  for(int i=0; i<NUM_OBJECTS; i++) {
    float objDist;
    if(length(globalObjectRadii[i]) == 0.0){ objDist = maxDist;}
    else{
      if(globalObjectTypes[i] == 0) { objDist = sphereSDF(geometryNormalize(absoluteSamplePoint * globalObjectBoosts[i], false), ORIGIN, globalObjectRadii[i].x); }
      else if(globalObjectTypes[i] == 1) { objDist = sortOfEllipsoidSDF(absoluteSamplePoint, globalObjectBoosts[i]);}
      else { objDist = maxDist; }
      distance = min(distance, objDist);
      if(distance < EPSILON){
        hitWhich = 2;
      }
    }
  }
  return distance;
}

//NORMAL FUNCTIONS ++++++++++++++++++++++++++++++++++++++++++++++++++++
vec4 estimateNormal(vec4 p) { // normal vector is in tangent hyperplane to hyperboloid at p
    // float denom = sqrt(1.0 + p.x*p.x + p.y*p.y + p.z*p.z);  // first, find basis for that tangent hyperplane
    float newEp = EPSILON * 10.0;
    vec4 basis_x = geometryNormalize(vec4(p.w,0.0,0.0,p.x), true);  // dw/dx = x/w on hyperboloid
    vec4 basis_y = vec4(0.0,p.w,0.0,p.y);  // dw/dy = y/denom
    vec4 basis_z = vec4(0.0,0.0,p.w,p.z);  // dw/dz = z/denom  /// note that these are not orthonormal!
    basis_y = geometryNormalize(basis_y - geometryDot(basis_y, basis_x)*basis_x, true); // need to Gram Schmidt
    basis_z = geometryNormalize(basis_z - geometryDot(basis_z, basis_x)*basis_x - geometryDot(basis_z, basis_y)*basis_y, true);
    if(hitWhich == 1 || hitWhich == 2){ //global light scene
      return geometryNormalize( //p+EPSILON*basis_x should be lorentz normalized however it is close enough to be good enough
          basis_x * (globalSceneSDF(p + newEp*basis_x) - globalSceneSDF(p - newEp*basis_x)) +
          basis_y * (globalSceneSDF(p + newEp*basis_y) - globalSceneSDF(p - newEp*basis_y)) +
          basis_z * (globalSceneSDF(p + newEp*basis_z) - globalSceneSDF(p - newEp*basis_z)),
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
  if(isStereo != 0) { resolution.x = resolution.x * 0.5; }
  if(isStereo == 1) { fragCoord.x = fragCoord.x - resolution.x; }
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

void raymarch(vec4 rO, vec4 rD){
  int fakeI = 0;
  float globalDepth = MIN_DIST;
  float localDepth = globalDepth;
  mat4 fixMatrix = mat4(1.0);
  vec4 localrO = rO;
  vec4 localrD = rD;
  
  // Trace the local scene, then the global scene:
  for(int i = 0; i< MAX_MARCHING_STEPS; i++){
    if(fakeI >= maxSteps || globalDepth >= maxDist){
      //when we break it's as if we reached our max marching steps
      break;
    }
    fakeI++;
    vec4 localEndPoint = pointOnGeodesic(localrO, localrD, localDepth);
    if(isOutsideCell(localEndPoint, fixMatrix)){
      totalFixMatrix *= fixMatrix;
      localrO = geometryNormalize(localEndPoint*fixMatrix, false);
      localrD = geometryFixDirection(localrO, localrD, fixMatrix); 
      localDepth = MIN_DIST;
    }
    else{
      float localDist = min(0.5,localSceneSDF(localEndPoint));
      if(localDist < EPSILON){
        hitWhich = 3;
        sampleEndPoint = localEndPoint;
        sampleTangentVector = tangentVectorOnGeodesic(localrO, localrD, localDepth);
        break;
      }
      localDepth += localDist;
      globalDepth += localDist;
    }
  }
  
  // Set localDepth to our new max tracing distance:
  localDepth = min(globalDepth, maxDist);
  globalDepth = MIN_DIST;
  fakeI = 0;
  for(int i = 0; i< MAX_MARCHING_STEPS; i++){
    if(fakeI >= maxSteps){
      break;
    }
    fakeI++;
    vec4 globalEndPoint = pointOnGeodesic(rO, rD, globalDepth);
    float globalDist = globalSceneSDF(globalEndPoint);
    if(globalDist < EPSILON){
      // hitWhich has been set by globalSceneSDF
      sampleEndPoint = globalEndPoint;
      sampleTangentVector = tangentVectorOnGeodesic(rO, rD, globalDepth);
      return;
    }
    globalDepth += globalDist;
    if(globalDepth >= localDepth){
      break;
    }
  }
}

void main(){
  vec4 rayOrigin = ORIGIN;
  vec4 rayDirV = getRayPoint(screenResolution, gl_FragCoord.xy);
  //camera position must be translated in hyperboloid ------------------------

  //TODO: remove the leftCurrentBoost and rightCurrentBoost in favor of 
  //stereoBoost which we can set at the time of render on the JS side
  //this can be seen in the hypTest file in my mtwoodard.github.io repo
  
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
  raymarch(rayOrigin, rayDirVPrime);

  //Based on hitWhich decide whether we hit a global object, local object, or nothing
  if(hitWhich == 0){ //Didn't hit anything ------------------------
    gl_FragColor = vec4(0.0);
    return;
  }
  else if(hitWhich == 1){ // global lights
    gl_FragColor = vec4(globalLightColor.rgb, 1.0);
    return;
  }
  else{ // objects
    N = estimateNormal(sampleEndPoint);
    vec3 color;
    if(hitWhich == 2){ // global objects
      color = phongModel(invGlobalObjectBoosts[0], true);
    }else{ // local objects
      color = phongModel(mat4(1.0), false);
    }
    gl_FragColor = vec4(color, 1.0);
  }
}
