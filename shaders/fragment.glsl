//GLOBAL OBJECTS SCENE ++++++++++++++++++++++++++++++++++++++++++++++++
float globalSceneSDF(vec4 samplePoint, mat4 globalTransMatrix, bool collideWithLights){
  float distance = maxDist;
  if(collideWithLights){
    //Light Objects
    for(int i=0; i<3; i++){
      float objDist;
      if(lightIntensities[i].w == 0.0) { objDist = maxDist; }
      else{
        objDist = sphereSDF(samplePoint, lightPositions[i]*globalTransMatrix, 1.0/(10.0*lightIntensities[i].w));
        distance = min(distance, objDist);
        if(distance < EPSILON){
          hitWhich = 1;
          globalLightColor = lightIntensities[i];
          return distance;
        }
      }
    }
    if(controllerCount != 0){
      float objDist = sphereSDF(samplePoint, ORIGIN*controllerBoosts[0]*currentBoost, 1.0/(10.0 * lightIntensities[4].w));
      distance = min(distance, objDist);
      if(distance < EPSILON){
        hitWhich = 1;
        globalLightColor = lightIntensities[4];
        return distance;
      }
    }
  }
  if(controllerCount == 2){
    float objDist = sphereSDF(samplePoint, ORIGIN*controllerBoosts[1]*currentBoost, 1.0/(10.0 * lightIntensities[4].w));
    distance = min(distance, objDist);
    if(distance < EPSILON){
      hitWhich = 2;
      return distance;
    }
  }
  //Global Objects
  for(int i=0; i<NUM_OBJECTS; i++) {
    float objDist;
    if(length(globalObjectRadii[i]) == 0.0){ objDist = maxDist;}
    else{
      objDist = sphereSDF(samplePoint, globalObjectBoosts[i][3] * globalTransMatrix, globalObjectRadii[i].x);
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
          basis_x * (globalSceneSDF(p + newEp*basis_x, invCellBoost, true) - globalSceneSDF(p - newEp*basis_x, invCellBoost, true)) +
          basis_y * (globalSceneSDF(p + newEp*basis_y, invCellBoost, true) - globalSceneSDF(p - newEp*basis_y, invCellBoost, true)) +
          basis_z * (globalSceneSDF(p + newEp*basis_z, invCellBoost, true) - globalSceneSDF(p - newEp*basis_z, invCellBoost, true)),
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

vec4 getRayPoint(vec2 resolution, vec2 fragCoord, bool isRight){ //creates a point that our ray will go through
    if(isStereo == 1){
      resolution.x = resolution.x * 0.5;
      if(isRight) { fragCoord.x = fragCoord.x - resolution.x; }
    }
    vec2 xy = 0.2*((fragCoord - 0.5*resolution)/resolution.x);
    float z = 0.1/tan(radians(fov*0.5));
    vec4 p =  geometryNormalize(vec4(xy,-z,1.0), false);
    return p;
}

bool isOutsideSimplex(vec4 samplePoint, out mat4 fixMatrix){
  vec4 kleinSamplePoint = projectToKlein(samplePoint);
  for(int i=0; i<4; i++){
    vec3 normal = simplexMirrorsKlein[i].xyz;
    vec3 offsetSample = kleinSamplePoint.xyz - normal * simplexMirrorsKlein[i].w;  // Deal with any offset.
    if( dot(offsetSample, normal) > 1e-7 ) {
      fixMatrix = invGenerators[i];
      return true;
    }
  }
  return false;
}

// This function is intended to be geometry-agnostic.
bool isOutsideCell(vec4 samplePoint, out mat4 fixMatrix){
  if( useSimplex ) {
    return isOutsideSimplex( samplePoint, fixMatrix );
  }

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

void raymarch(vec4 rO, vec4 rD, out mat4 totalFixMatrix){
  float globalDepth = MIN_DIST; float localDepth = globalDepth;
  vec4 localrO = rO; vec4 localrD = rD;
  totalFixMatrix = mat4(1.0);
  mat4 fixMatrix = mat4(1.0);
  int fakeI = 0;
  
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
    float globalDist = globalSceneSDF(globalEndPoint, invCellBoost, true);
    if(globalDist < EPSILON){
      // hitWhich has been set by globalSceneSDF
      totalFixMatrix = mat4(1.0);
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
  
  //stereo translations
  bool isRight = gl_FragCoord.x/screenResolution.x > 0.5;
  vec4 rayDirV = getRayPoint(screenResolution, gl_FragCoord.xy, isRight);
  
  if(isStereo == 1){
    if(isRight){
      rayOrigin *= stereoBoosts[1];
      rayDirV *= stereoBoosts[1];
    }
    else{
      rayOrigin *= stereoBoosts[0];
      rayDirV *= stereoBoosts[0];
    }
    
  }

  rayOrigin *= currentBoost;
  rayDirV *= currentBoost;
  //generate direction then transform to hyperboloid ------------------------
  vec4 rayDirVPrime = geometryDirection(rayOrigin, rayDirV);
  //get our raymarched distance back ------------------------
  mat4 totalFixMatrix = mat4(1.0);
  raymarch(rayOrigin, rayDirVPrime, totalFixMatrix);

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
    mat4 globalTransMatrix = invCellBoost * totalFixMatrix;
    if(hitWhich == 2){ // global objects
      color = phongModel(invGlobalObjectBoosts[0], true, globalTransMatrix);
    }else{ // local objects
      color = phongModel(mat4(1.0), false, globalTransMatrix);
    }
    gl_FragColor = vec4(color, 1.0);
  }
}
