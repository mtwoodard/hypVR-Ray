const int MAX_MARCHING_STEPS = 127;
const float MIN_DIST = 0.0;
const float MAX_DIST = 10.0;
const float EPSILON = 0.0001;
const vec4 ORIGIN = vec4(0,0,0,1);

const float halfIdealCubeWidthKlein = 0.5773502692;
const vec4 idealCubeCornerKlein = vec4(halfIdealCubeWidthKlein, halfIdealCubeWidthKlein, halfIdealCubeWidthKlein, 1.0);

/// for {4,3,6}
 const float sphereRad = 1.0;
 const float horosphereSize = 2.6;  //spheres intersect

// const float sphereRad = 0.5;
// const float horosphereSize = 1.5;  // horospheres intersect

/// for {4,3,7}
//const float sphereRad = 1.0;      //spheres intersect
const float planeOffset = 0.75;

uniform vec2 screenResolution;
uniform vec3 cameraPos;
uniform vec4 cameraQuat;
uniform float fov;
uniform mat4 generators[6];
uniform mat4 invGenerators[6];
uniform mat4 currentBoost;
uniform mat4 cellBoost;
uniform vec4 lightSourcePosition;
uniform int maxSteps;
uniform int sceneIndex;
uniform float halfCubeWidthKlein;

//-------------------------------------------------------
//Hyperboloid Functions
//-------------------------------------------------------

float lorentzDot(vec4 u, vec4 v){
  return u.w*v.w - u.x*v.x - u.y*v.y - u.z*v.z;
} /// on hyperbolold if lorentzDot(u,u) = 1, so w*w = 1 + x*x + y*y + z*z

vec4 projectToKlein(vec4 v){
  return v/v.w;
}

vec3 qtransform( vec4 q, vec3 v ){
  return v + 2.0*cross(cross(v, -q.xyz ) + q.w*v, -q.xyz);
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

float hypNorm(vec4 v){
  return sqrt(abs(lorentzDot(v,v)));
}

vec4 lorentzNormalize(vec4 v){  // cannot do to a light like vector
  return v/hypNorm(v);  // projects a non-light vector to one of the two hyperboloids
}

float hypDistance(vec4 u, vec4 v){
  float bUV = lorentzDot(u,v);
  return acosh(bUV);
}

vec4 directionFrom2Points(vec4 u, vec4 v){  // given points u and v on hyperboloid, make
  // the "direction" (velocity vector) vPrime for use in parametrising the geodesic from u through v
  vec4 w = v - lorentzDot(u, v)*u;
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

//Raymarch Primitives
float sphereHSDF(vec4 samplePoint, vec4 center, float radius){
  return hypDistance(samplePoint, center) - radius;
}

float horosphereHSDF(vec4 samplePoint, vec4 lightPoint){
  return log(lorentzDot(samplePoint, lightPoint));
}

float geodesicPlaneHSDF(vec4 samplePoint, vec4 dualPoint, float offset){
  return asinh(lorentzDot(samplePoint, dualPoint)) - offset;
}

float geodesicCylinderHSDFplanes(vec4 samplePoint, vec4 dualPoint1, vec4 dualPoint2, float radius){
  // defined by two perpendicular geodesic planes
  float dot1 = lorentzDot(samplePoint, dualPoint1);
  float dot2 = lorentzDot(samplePoint, dualPoint2);
  return asinh(sqrt(dot1*dot1 + dot2*dot2)) - radius;
}

float geodesicCylinderHSDFends(vec4 samplePoint, vec4 lightPoint1, vec4 lightPoint2, float radius){
  // defined by two light points (at ends of the geodesic) whose lorentzDot is 1
  return acosh(sqrt(2.0*lorentzDot(lightPoint1, samplePoint)*lorentzDot(lightPoint2, samplePoint))) - radius;
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

float localSceneHSDF(vec4 samplePoint){
  if(sceneIndex == 1){  // sphere and horosphere
     float sphere = sphereHSDF(samplePoint, ORIGIN, sphereRad);
     float horosphere = horosphereHSDF(abs(samplePoint), horosphereSize*idealCubeCornerKlein);
     float final = -unionSDF(horosphere, sphere);
     return final;
  }
  else if(sceneIndex == 2){  // sphere and plane
   float sphere = sphereHSDF(samplePoint, ORIGIN, sphereRad);
   vec4 dualPoint = lorentzNormalize(vec4(halfCubeWidthKlein,halfCubeWidthKlein,halfCubeWidthKlein,1.0));
   float plane0 = geodesicPlaneHSDF(abs(samplePoint), dualPoint, planeOffset);
   float final = -unionSDF(plane0, sphere);
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
    dualPoint2 = lorentzNormalize(dualPoint2 + lorentzDot(dualPoint2, dualPoint1) * dualPoint1);
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
  else if(sceneIndex  == 4){  // cube sides
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
