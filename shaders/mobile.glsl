const int MAX_MARCHING_STEPS = 127;
const float MIN_DIST = 0.0;
const float MAX_DIST = 10.0;
const float EPSILON = 0.0001;
const vec4 ORIGIN = vec4(0,0,0,1);

const float halfIdealCubeWidthKlein = 0.5773502692;
const vec4 idealCubeCornerKlein = vec4(halfIdealCubeWidthKlein, halfIdealCubeWidthKlein, halfIdealCubeWidthKlein, 1.0);

uniform int isStereo;
uniform int lightingModel;
uniform mat4 cameraProjection;
uniform vec2 screenResolution;
uniform vec4 cameraQuat;
uniform float fov;
uniform mat4 generators[6];
uniform mat4 invGenerators[6];
uniform mat4 currentBoost;
uniform mat4 leftCurrentBoost;
uniform mat4 rightCurrentBoost;
uniform vec4 leftEyeRotation;
uniform vec4 rightEyeRotation;
uniform mat4 cellBoost;
uniform mat4 invCellBoost;
uniform vec4 lightSourcePosition;
uniform int maxSteps;
//--------------------------------------------
//Scene Dependent Variables
//--------------------------------------------
uniform int sceneIndex;
uniform float halfCubeWidthKlein;
uniform float sphereRad;
uniform float tubeRad;
uniform float horosphereSize;
uniform float planeOffset;

// The type of cut (1=sphere, 2=horosphere, 3=plane) for the vertex opposite the fundamental simplex's 4th mirror.
// These integers match our values for the geometry of the honeycomb vertex figure.
// We'll need more of these later when we support more symmetry groups.
uniform int cut4;

//Quaternion Math
vec3 qtransform( vec4 q, vec3 v ){
  return v + 2.0*cross(cross(v, -q.xyz ) + q.w*v, -q.xyz);
}

//Raymarch Functions
float unionSDF(float d1, float d2){
  return min(d1, d2);
}

float differenceSDF(float d1, float d2){
  return max(-d1, d2);
}

float weightedAverageSDF(float d1, float d2, float k){
  return (1.0-k)*d1 + k*d2;
}

//-------------------------------------------------------
//Hyperbolic Math functions
//-------------------------------------------------------
float cosh(float x){
  float eX = exp(x);
  return (0.5 * (eX + 1.0/eX));
}
float sinh(float x){
  float eX = exp(x);
  return (0.5 * (eX - 1.0/eX));
}
float acosh(float x){ //must be more than 1
  return log(x + sqrt(x*x-1.0));
}
float asinh(float x){
  return log(x + sqrt(x*x+1.0));
}

//-------------------------------------------------------
//Hyperboloid Functions
//-------------------------------------------------------

float lorentzDot(vec4 u, vec4 v){
  return  u.x*v.x + u.y*v.y + u.z*v.z - u.w*v.w;
} /// on hyperbolold if lorentzDot(u,u) = 1, so w*w = 1 + x*x + y*y + z*z

vec4 projectToKlein(vec4 v){
  return v/v.w;
}

float hypNorm(vec4 v){
  return sqrt(abs(lorentzDot(v,v)));
}

vec4 lorentzNormalize(vec4 v){  // cannot do to a light like vector
  return v/hypNorm(v);  // projects a non-light vector to one of the two hyperboloids
}

float hypDistance(vec4 u, vec4 v){
  float bUV = -lorentzDot(u,v);
  return acosh(bUV);
}

vec4 directionFrom2Points(vec4 u, vec4 v){  // given points u and v on hyperboloid, make
  // the "direction" (velocity vector) vPrime for use in parametrising the geodesic from u through v
  vec4 w = v + lorentzDot(u, v)*u;
  return (1.0/hypNorm(w)*w);
}

vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist){ // get point on
  // hyperboloid at distance dist on the geodesic from u through v
  return u*cosh(dist) + vPrime*sinh(dist);
}

vec4 tangentVectorOnGeodesic(vec4 u, vec4 vPrime, float dist){
  // note that this point has lorentzDot with itself of -1, so it is on other hyperboloid
  return u*sinh(dist) + vPrime*cosh(dist);
}

vec4 pointOnGeodesicAtInfinity(vec4 u, vec4 vPrime){ // returns point on the light
  // cone intersect Klein model corresponding to the point at infinity on the
  // geodesic through u and v
  return projectToKlein(u + vPrime);
}

mat4 translateByVector(vec3 v) { // trickery from Jeff Weeks' Curved Spaces app
  float dx = v.x;
  float dy = v.y;
  float dz = v.z;
  float len = sqrt(dx*dx + dy*dy + dz*dz);
  if (len == 0.0){
    return mat4(1.0);
  }
  else{
      dx /= len;
      dy /= len;
      dz /= len;
      mat4 m = mat4(vec4(0, 0, 0, dx),
                    vec4(0, 0, 0, dy),
                    vec4(0, 0, 0, dz),
                    vec4(dx,dy,dz, 0));
      mat4 m2 = m*m;
      float c1 = sinh(len);
      float c2 = cosh(len) - 1.0;
      return mat4(1.0) + c1 * m + c2 * m2;
    }
}


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

//Raymarch Primitives
float sphereHSDF(vec4 samplePoint, vec4 center, float radius){
  return hypDistance(samplePoint, center) - radius;
}

// A horosphere can be constructed by offseting from a standard horosphere.
// Our standard horosphere will have a center in the direction of lightPoint
// and go through the origin. Negative offsets will "shrink" it.
float horosphereHSDF(vec4 samplePoint, vec4 lightPoint, float offset){
  return log(-lorentzDot(samplePoint, lightPoint)) - offset;
}

float geodesicPlaneHSDF(vec4 samplePoint, vec4 dualPoint, float offset){
  return asinh(-lorentzDot(samplePoint, dualPoint)) - offset;
}

float geodesicCylinderHSDFplanes(vec4 samplePoint, vec4 dualPoint1, vec4 dualPoint2, float radius){
  // defined by two perpendicular geodesic planes
  float dot1 = -lorentzDot(samplePoint, dualPoint1);
  float dot2 = -lorentzDot(samplePoint, dualPoint2);
  return asinh(sqrt(dot1*dot1 + dot2*dot2)) - radius;
}

float geodesicCylinderHSDFends(vec4 samplePoint, vec4 lightPoint1, vec4 lightPoint2, float radius){
  // defined by two light points (at ends of the geodesic) whose lorentzDot is 1
  return acosh(sqrt(2.0*-lorentzDot(lightPoint1, samplePoint)*-lorentzDot(lightPoint2, samplePoint))) - radius;
}


float localSceneHSDF(vec4 samplePoint){
  if(sceneIndex == 1){  // cuts into the simplex
     float sphere = sphereHSDF(samplePoint, ORIGIN, sphereRad);
     float vertexSphere = 0.0;
     if(cut4 == 2) {
        vertexSphere = horosphereHSDF(abs(samplePoint), idealCubeCornerKlein, horosphereSize);
     }
	 if(cut4 == 1 || cut4 == 3) {	// Interesting that this works for finite spheres as well.
        vec4 dualPoint = lorentzNormalize(vec4(halfCubeWidthKlein,halfCubeWidthKlein,halfCubeWidthKlein,1.0));
        vertexSphere = geodesicPlaneHSDF(abs(samplePoint), dualPoint, planeOffset);
     }
     float final = -unionSDF(vertexSphere,sphere);
     return final;
  }
  else if(sceneIndex == 2){  // edge tubes
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
    vec4 dualPoint1 = lorentzNormalize(vec4(1.0/halfCubeWidthKlein,0.0,0.0,1.0));
    vec4 dualPoint2 = vec4(0.0,1.0/halfCubeWidthKlein,0.0,1.0);
    dualPoint2 = lorentzNormalize(dualPoint2 - lorentzDot(dualPoint2, dualPoint1) * dualPoint1);
    float edgesDistance = geodesicCylinderHSDFplanes(samplePoint, dualPoint1, dualPoint2, tubeRad);

    float final = edgesDistance;
    return final;
  }
  else if(sceneIndex == 3){  // edge medial surfaces
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
    vec4 dualPoint1 = lorentzNormalize(vec4(1.0/halfCubeWidthKlein,0.0,0.0,1.0));
    vec4 dualPoint2 = vec4(0.0,1.0/halfCubeWidthKlein,0.0,1.0);
    dualPoint2 = lorentzNormalize(dualPoint2 - lorentzDot(dualPoint2, dualPoint1) * dualPoint1);
    float edgesDistance = geodesicCylinderHSDFplanes(samplePoint, dualPoint1, dualPoint2, 0.0);
    // the following two ways to define the geodesic should give the same result
    // vec4 dualPoint1 = vec4(0.0,1.0,0.0,0.0);
    // vec4 dualPoint2 = vec4(0.0,0.0,1.0,0.0);
    // float final = -geodesicCylinderHSDFplanes(samplePoint, dualPoint1, dualPoint2, 0.6);

    vec4 lightPoint1 = (1.0/sqrt(2.0))*vec4(1.0,0.0,0.0,1.0);
    vec4 lightPoint2 = (1.0/sqrt(2.0))*vec4(-1.0,0.0,0.0,1.0);
    float dualEdgesDistance = geodesicCylinderHSDFends(samplePoint, lightPoint1, lightPoint2, 0.0);

    float final = 0.5*edgesDistance - 0.5*dualEdgesDistance;
    return final;
  }
  else if(sceneIndex == 4){  // cube sides
    /// draw sides of the cube fundamental domain
    vec4 dualPoint0 = lorentzNormalize(vec4(1.0/halfCubeWidthKlein,0.0,0.0,1.0));
    vec4 dualPoint1 = lorentzNormalize(vec4(0.0,1.0/halfCubeWidthKlein,0.0,1.0));
    vec4 dualPoint2 = lorentzNormalize(vec4(0.0,0.0,1.0/halfCubeWidthKlein,1.0));
    float plane0 = geodesicPlaneHSDF(abs(samplePoint), dualPoint0, 0.0);
    float plane1 = geodesicPlaneHSDF(abs(samplePoint), dualPoint1, 0.0);
    float plane2 = geodesicPlaneHSDF(abs(samplePoint), dualPoint2, 0.0);
    float final = unionSDF(unionSDF(plane0,plane1),plane2);
    return final;
  }
}

float globalSceneHSDF(vec4 samplePoint){
  vec4 absoluteSamplePoint = samplePoint * cellBoost; // correct for the fact that we have been moving
  return sphereHSDF(absoluteSamplePoint, lightSourcePosition, 0.1);
}

//NORMAL FUNCTIONS ++++++++++++++++++++++++++++++++++++++++++++++++++++
vec4 estimateNormal(vec4 p, int sceneType) { // normal vector is in tangent plane to hyperboloid at p
    // float denom = sqrt(1.0 + p.x*p.x + p.y*p.y + p.z*p.z);  // first, find basis for that tangent hyperplane
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
          basis_x * (globalSceneHSDF(lorentzNormalize(p + EPSILON*basis_x)) - globalSceneHSDF(lorentzNormalize(p - EPSILON*basis_x))) +
          basis_y * (globalSceneHSDF(lorentzNormalize(p + EPSILON*basis_y)) - globalSceneHSDF(lorentzNormalize(p - EPSILON*basis_y))) +
          basis_z * (globalSceneHSDF(lorentzNormalize(p + EPSILON*basis_z)) - globalSceneHSDF(lorentzNormalize(p - EPSILON*basis_z)))
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
    float dist = raymarchDistance(rayOrigin, rayDirVPrime, MIN_DIST, MAX_DIST, localEndPoint,
      globalEndPoint, localEndTangentVector, globalEndTangentVector, totalFixMatrix,
      tilingSteps, hitWhich);
    if(hitWhich == 0){ //Didn't hit anything ------------------------
      vec4 pointAtInfinity = pointOnGeodesicAtInfinity(rayOrigin, rayDirVPrime) * cellBoost;  //cellBoost corrects for the fact that we have been moving through cubes
      gl_FragColor = vec4(0.5*normalize(pointAtInfinity.xyz)+vec3(0.5,0.5,0.5),1.0);
      return;
    }
    else if(hitWhich == 1){ // global
      vec4 surfaceNormal = estimateNormal(globalEndPoint, hitWhich);
      float cameraLightMatteShade = -lorentzDot(surfaceNormal, globalEndTangentVector);
      gl_FragColor = vec4(cameraLightMatteShade,0.0,0.0,1.0);
      return;
    }
    else if(hitWhich == 2){ // local
      vec4 localSurfaceNormal = estimateNormal(localEndPoint, hitWhich);
      vec4 translatedLightSourcePosition = lightSourcePosition * invCellBoost * totalFixMatrix;
      vec4 directionToLightSource = -directionFrom2Points(localEndPoint, translatedLightSourcePosition);
      vec4 reflectedLightDirection = 2.0*lorentzDot(directionToLightSource, localSurfaceNormal)*localSurfaceNormal - directionToLightSource;

      float cameraLightMatteShade = max(-lorentzDot(localSurfaceNormal, localEndTangentVector),0.0);
      float sourceLightMatteShade = max(-lorentzDot(localSurfaceNormal, directionToLightSource),0.0);
      float reflectedShineShade = max(lorentzDot(reflectedLightDirection, localEndTangentVector),0.0);
      // float matteShade = sourceLightMatteShade;
      float matteShade = 0.2*cameraLightMatteShade + 0.8*sourceLightMatteShade;

      float depthShade = max(1.0-dist/5.0, 0.0);
      float stepsShade = max(1.0-tilingSteps/3.0,0.0);
      // float comboShade = shineShade*depthShade;
      vec4 depthColor = vec4(depthShade,depthShade*0.65,0.1,1.0);
      // vec4 stepsColor = vec4(stepsShade,stepsShade,stepsShade,1.0);
      vec4 matteColor = vec4(matteShade,matteShade,matteShade,1.0);
      vec4 reflectedColor;
      if(sourceLightMatteShade > 0.0) {reflectedColor = vec4(reflectedShineShade,reflectedShineShade,reflectedShineShade,1.0);}
      else {reflectedColor = vec4(0.0,0.0,0.0,1.0);}
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

      if (lightingModel == 1)
      {
        gl_FragColor = 0.3*depthColor + 0.7*matteColor;
      }
      else // lightingModel = 0
      {
        gl_FragColor = 0.3*depthColor + 0.5*matteColor + 0.2*reflectedColor;
      }
      // gl_FragColor = reflectedColor;
      // gl_FragColor = shineColor;
      // gl_FragColor = 0.2*stepsColor + 0.8*normalColor;
      // gl_FragColor = normalColor;
      // gl_FragColor = endRayColor;
    }
  }
