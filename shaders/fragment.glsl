//GLOBAL OBJECTS SCENE ++++++++++++++++++++++++++++++++++++++++++++++++
float globalSceneSDF(vec4 samplePoint){
  vec4 absoluteSamplePoint = samplePoint * cellBoost; // correct for the fact that we have been moving
  float distance = MAX_DIST;
  //Light Objects
  for(int i=0; i<4; i++){
    float objDist;
    if(lightIntensities[i].w == 0.0) { objDist = MAX_DIST; }
    else{
      objDist = sphereSDF(absoluteSamplePoint, lightPositions[i], 1.0/(10.0*lightIntensities[i].w));
      if(distance > objDist){
        hitWhich = 1;
        distance = objDist;
        globalLightColor = lightIntensities[i];
      }
    }
  }
  //Controller Objects
  for(int i=0; i<2; i++){
    if(controllerCount != 0){
      float objDist = sphereSDF(absoluteSamplePoint, ORIGIN*controllerBoosts[i-4]*currentBoost, 1.0/(10.0 * lightIntensities[i].w));
      if(distance > objDist){
        hitWhich = 1;
        distance = objDist;
        globalLightColor = lightIntensities[i+4];
      }
      if(controllerCount == 1) break;
    }
  }
  //Global Objects
  for(int i=0; i<4; i++){
    float objDist;
    if(length(globalObjectRadii[i]) == 0.0){ objDist = MAX_DIST;}
    else{
      if(globalObjectTypes[i] == 0) { objDist = sphereSDF(absoluteSamplePoint, globalObjectBoosts[i][3], globalObjectRadii[i].x); }
      //if(globalObjectTypes[i] == 0) { objDist = sortOfEllipsoidSDF(absoluteSamplePoint);}
      else { objDist = MAX_DIST; }
      if(distance > objDist){
        hitWhich = 2;
        distance = objDist;
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
  mat4 fixMatrix;
  vec4 localrO = rO;
  vec4 localrD = rD;
  for(int i = 0; i< MAX_MARCHING_STEPS; i++){
    if(fakeI >= maxSteps){
      //when we break its as if we reached our max marching steps
      break;
    }
    fakeI++;
    vec4 localEndPoint = pointOnGeodesic(localrO, localrD, localDepth);
    vec4 globalEndPoint = pointOnGeodesic(rO, rD, globalDepth);
    if(isOutsideCell(localEndPoint, fixMatrix)){
      totalFixMatrix *= fixMatrix;
      localrO = geometryNormalize(localEndPoint*fixMatrix, false);
      localrD = geometryDirection(localrO, localrD*fixMatrix);
      localDepth = MIN_DIST;
    }
    else{
      float localDist = localSceneSDF(localEndPoint);
      float globalDist = globalSceneSDF(globalEndPoint);
      float dist = min(localDist, globalDist);
      if(dist < EPSILON){
        if(localDist < globalDist) hitWhich = 3;
        //Pass information out to global variables
        sampleInfo[0] = globalEndPoint; //global sample point
        sampleInfo[1] = tangentVectorOnGeodesic(rO, rD, globalDepth); //global tangent vector
        sampleInfo[2] = localEndPoint; //local sample point
        sampleInfo[3] = tangentVectorOnGeodesic(localrO, localrD, localDepth); //local tangent vector
        return;
      }
      globalDepth += dist;
      localDepth += dist;
      if(globalDepth >= MAX_DIST){
        hitWhich = 0;
      }
    }
  }
  hitWhich = 0;
}

void main(){
  vec4 rayOrigin = ORIGIN;
  vec4 rayDirV = getRayPoint(screenResolution, gl_FragCoord.xy);
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
  else if(hitWhich == 2){ // global objects
    N = estimateNormal(sampleInfo[0]);
    vec3 color = phongModel(invGlobalObjectBoosts[0], true);
    gl_FragColor = vec4(color, 1.0);
    return;
  }
  else if(hitWhich == 3){ // local
    N = estimateNormal(sampleInfo[2]);
    vec3 color = phongModel(mat4(1.0), false);
    gl_FragColor = vec4(color, 1.0);
  }
}
