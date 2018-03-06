vec4 getRay(float fov, vec2 resolution, vec2 fragCoord){
  vec2 xy = 0.2*((fragCoord - 0.5*resolution)/resolution.x);
  float z = 0.1;
  vec3 pPre = qtransform(cameraQuat, vec3(-xy,z));
  vec4 p = lorentzNormalize(vec4(pPre, 1.0));
  return p;
}

float raymarchDistance(vec4 rO, vec4 rD, float start, float end, out vec4 endPoint, out vec4 endRayTangentVector, out float tilingSteps){
  int fakeI = 0;
  float totalDepth = start;
  float localDepth = totalDepth;
  mat4 fixMatrix;
  for(int i = 0; i< MAX_MARCHING_STEPS; i++){
    if(fakeI >= maxSteps){
      //when we break its as if we reached our max marching steps
      break;
    }
    fakeI++;
    vec4 samplePoint = pointOnGeodesic(rO, rD, localDepth);
    if(isOutsideCell(samplePoint, fixMatrix)){
      tilingSteps++;
      vec4 newDirection = pointOnGeodesic(rO, rD, localDepth + 0.1); //forwards a bit
      rO = samplePoint*fixMatrix;
      newDirection *= fixMatrix;
      rO = lorentzNormalize(rO);
      newDirection = lorentzNormalize(newDirection);
      rD = vPrimeFromV(rO,newDirection);
      localDepth = start;
    }
    else{
      float dist = sceneHSDF(samplePoint);
      //float dist = unionSDF(sceneHSDF(samplePoint), sphereHSDF(samplePoint, rO*translateByVector(vec3(0,0,-0.2)), 0.1));
      if(dist < EPSILON){
        endPoint = samplePoint;
        endRayTangentVector = tangentVectorOnGeodesic(rO, rD, localDepth);
        return totalDepth;
      }
      totalDepth += dist;
      localDepth += dist;
      if(totalDepth >= end){
        endPoint = pointOnGeodesic(rO, rD, localDepth);
        endRayTangentVector = tangentVectorOnGeodesic(rO, rD, localDepth);
        return end;
      }
    }
  }
  endPoint = pointOnGeodesicAtInfinity(rO, rD);
  endRayTangentVector = tangentVectorOnGeodesic(rO, rD, localDepth);
  return end;
}

//COLORING FUNCTIONS ++++++++++++++++++++++++++++++++++++++++++++++++++++
vec4 estimateNormal(vec4 p, vec4 rO) { // normal vector is in tangent plane to hyperboloid at p
  // float denom = sqrt(1.0 + p.x*p.x + p.y*p.y + p.z*p.z);  // first, find basis for that tangent hyperplane
  float denom = p.w;
  vec4 basis_x = lorentzNormalize(vec4(denom,0.0,0.0,p.x));  // dw/dx = x/denom on hyperboloid
  vec4 basis_y = vec4(0.0,denom,0.0,p.y);  // dw/dy = y/denom
  vec4 basis_z = vec4(0.0,0.0,denom,p.z);  // dw/dz = z/denom  /// note that these are not orthonormal!
  basis_y = lorentzNormalize(basis_y + lorentzDot(basis_y, basis_x)*basis_x); // need to Gram Schmidt
  basis_z = lorentzNormalize(basis_z + lorentzDot(basis_z, basis_x)*basis_x + lorentzDot(basis_z, basis_y)*basis_y);
 return lorentzNormalize(
     basis_x * (sceneHSDF(lorentzNormalize(p + EPSILON*basis_x)) - sceneHSDF(lorentzNormalize(p - EPSILON*basis_x))) +
     basis_y * (sceneHSDF(lorentzNormalize(p + EPSILON*basis_y)) - sceneHSDF(lorentzNormalize(p - EPSILON*basis_y))) +
     basis_z * (sceneHSDF(lorentzNormalize(p + EPSILON*basis_z)) - sceneHSDF(lorentzNormalize(p - EPSILON*basis_z)))
 );
}
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

void main(){
  vec4 endPoint = vec4(0.0,0.0,0.0,1.0);
  vec4 endRayTangentVector = vec4(0.0,0.0,0.0,0.0);
  float tilingSteps = 1.0;
  vec4 rayOrigin = vec4(0.0,0.0,0.0,1.0);
  //camera position must be translated in hyperboloid ------------------------
  //rayOrigin *= translateByVector(cameraPos);
  rayOrigin *= currentBoost;
  //generate direction then transform to hyperboloid ------------------------
  vec4 rayDirV = getRay(90.0, screenResolution, gl_FragCoord.xy);
  //rayDirV *= translateByVector(cameraPos);
  rayDirV *= currentBoost;
  vec4 rayDirVPrime = vPrimeFromV(rayOrigin, rayDirV);
  //get our raymarched distance back ------------------------
  float dist = raymarchDistance(rayOrigin, rayDirVPrime, MIN_DIST, MAX_DIST, endPoint, endRayTangentVector, tilingSteps);
  if((dist > MAX_DIST - EPSILON)||(tilingSteps >= float(MAX_MARCHING_STEPS) - 0.5)){
    //Didn't hit anything ------------------------
    vec4 pointAtInfinity = pointOnGeodesicAtInfinity(rayOrigin, rayDirVPrime);
    gl_FragColor = vec4(0.5*pointAtInfinity.xyz+vec3(0.5,0.5,0.5),1.0);
    return;
  }

  vec4 surfaceNormal = estimateNormal(endPoint, rayOrigin);
  float shineShade = lorentzDot(surfaceNormal, endRayTangentVector);
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
