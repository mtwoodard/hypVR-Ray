#version 300 es


//#extension GL_EXT_draw_buffers : require

//--------------------------------------------
//Global Constants
//--------------------------------------------
const int MAX_MARCHING_STEPS = 127;
const float MIN_DIST = 0.0;
const float MAX_DIST = 100.0;
const float EPSILON = 0.0001;
const vec4 ORIGIN = vec4(0,0,0,1);
//--------------------------------------------
//Global Variables
//--------------------------------------------
vec4 sampleEndPoint = vec4(1, 1, 1, 1);
vec4 sampleTangentVector = vec4(1, 1, 1, 1);
vec4 globalLightColor = ORIGIN;
vec4 N = vec4(0,0,0,1);
int hitWhich = 0;
//-------------------------------------------
//Translation & Utility Variables
//--------------------------------------------
uniform int isStereo;
uniform vec2 screenResolution;
uniform float fov;
uniform mat4 invGenerators[6];
uniform mat4 currentBoost;
uniform mat4 stereoBoosts[2];
uniform mat4 cellBoost; 
uniform mat4 invCellBoost;
uniform int maxSteps;
//--------------------------------------------
//Lighting Variables & Global Object Variables
//--------------------------------------------
uniform vec4 lightPositions[4];
uniform vec4 lightIntensities[5]; //w component is the light's attenuation -- 5 since we need controllers
uniform sampler2D tex;
uniform int controllerCount; //Max is two
uniform mat4 controllerBoosts[2];
uniform mat4 globalObjectBoost;
uniform float globalObjectRadius;

out vec4 out_FragColor;

//--------------------------------------------------------------------
// Generalized Functions
//--------------------------------------------------------------------

vec4 geometryNormalize(vec4 v, bool toTangent);
vec4 geometryDirection(vec4 u, vec4 v);
float geometryDot(vec4 u, vec4 v);
float geometryDistance(vec4 u, vec4 v);
float geometryNorm(vec4 v){
  return sqrt(abs(geometryDot(v,v)));
}

vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist);

//--------------------------------------------------------------------
// Generalized SDFs
//--------------------------------------------------------------------

float globalSceneSDF(vec4 samplePoint, mat4 globalTransMatrix, bool collideWithLights);

float sphereSDF(vec4 samplePoint, vec4 center, float radius){
  return geometryDistance(samplePoint, center) - radius;
}

//--------------------------------------------------------------------
// Lighting Functions
//--------------------------------------------------------------------

vec4 texcube(vec4 samplePoint, mat4 toOrigin){
    float k = 4.0;
    vec4 newSP = samplePoint * toOrigin;
    vec3 p = mod(newSP.xyz,1.0);
    vec3 n = geometryNormalize(N*toOrigin, true).xyz; //Very hacky you are warned
    vec3 m = pow(abs(n), vec3(k));
    vec4 x = texture(tex, p.yz);
    vec4 y = texture(tex, p.zx);
    vec4 z = texture(tex, p.xy);
    return (x*m.x + y*m.y + z*m.z) / (m.x+m.y+m.z);
}

vec3 phongModel(mat4 invObjectBoost){
  //--------------------------------------------
  //Setup Variables
  //--------------------------------------------
  float ambient = 1.0;
  vec3 baseColor = vec3(0.0,1.0,1.0);
  vec4 SP = sampleEndPoint;

  baseColor = texcube(SP, cellBoost * invObjectBoost).xyz; 

  //Setup up color with ambient component
  vec3 color = baseColor * ambient; 

  return color;
}

//-------------------------------------------------------
// Generalized Functions
//-------------------------------------------------------
float geometryDot(vec4 u, vec4 v){
  return u.x*v.x + u.y*v.y + u.z*v.z - u.w*v.w; // Lorentz Dot
}
vec4 geometryNormalize(vec4 u, bool toTangent){
  return u/geometryNorm(u);
}
float geometryDistance(vec4 u, vec4 v){
  float bUV = -geometryDot(u,v);
  return acosh(bUV);
}

//Given two positions find the unit tangent vector at the first that points to the second
vec4 geometryDirection(vec4 u, vec4 v){
  vec4 w = v + geometryDot(u,v)*u;
  return geometryNormalize(w, true);
}

//-------------------------------------------------------
//Hyperboloid Functions
//-------------------------------------------------------

// Get point at distance dist on the geodesic from u in the direction vPrime
vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist){
  return u*cosh(dist) + vPrime*sinh(dist);
}

vec4 tangentVectorOnGeodesic(vec4 u, vec4 vPrime, float dist){
  // note that this point has geometryDot with itself of -1, so it is on other hyperboloid
  return u*sinh(dist) + vPrime*cosh(dist);
}

//********************************************************************************************************
//FRAGMENT
//********************************************************************************************************

//GLOBAL OBJECTS SCENE ++++++++++++++++++++++++++++++++++++++++++++++++
float globalSceneSDF(vec4 samplePoint, mat4 globalTransMatrix, bool collideWithLights){
  float distance = MAX_DIST;

  //Light Objects
  for(int i=0; i<NUM_LIGHTS; i++){
    float objDist;
    objDist = sphereSDF(samplePoint, lightPositions[i]*globalTransMatrix, 1.0/(10.0*lightIntensities[i].w));
    distance = min(distance, objDist);
    if(distance < EPSILON){
      hitWhich = 1;
      globalLightColor = lightIntensities[i];
      return distance;
    }
  }

  //Controllers
  if(controllerCount != 0){
    //Controller 1 is a light
    float objDist = sphereSDF(samplePoint, ORIGIN*controllerBoosts[0]*currentBoost, 1.0/(10.0 * lightIntensities[NUM_LIGHTS].w));
    distance = min(distance, objDist);
    if(distance < EPSILON){
      hitWhich = 1;
      globalLightColor = lightIntensities[NUM_LIGHTS];
      return distance;
    }
    //Controller 2 is an object
    if(controllerCount == 2){
      float objDist = sphereSDF(samplePoint, ORIGIN*controllerBoosts[1]*currentBoost, 1.0/(10.0 * lightIntensities[NUM_LIGHTS].w));
      distance = min(distance, objDist);
      if(distance < EPSILON){
        hitWhich = 2;
        return distance;
      }
    }
  }

  //Global Objects
  float objDist;
  objDist = sphereSDF(samplePoint, globalObjectBoost[3] * globalTransMatrix, globalObjectRadius);
  distance = min(distance, objDist);
  if(distance < EPSILON){
    hitWhich = 2;
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
    //p+EPSILON*basis_x should be lorentz normalized however it is close enough to be good enough
    return geometryNormalize( 
        basis_x * (globalSceneSDF(p + newEp*basis_x, invCellBoost, true) - globalSceneSDF(p - newEp*basis_x, invCellBoost, true)) +
        basis_y * (globalSceneSDF(p + newEp*basis_y, invCellBoost, true) - globalSceneSDF(p - newEp*basis_y, invCellBoost, true)) +
        basis_z * (globalSceneSDF(p + newEp*basis_z, invCellBoost, true) - globalSceneSDF(p - newEp*basis_z, invCellBoost, true)),
        true
    );
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

void raymarch(vec4 rO, vec4 rD){
  float globalDepth = MIN_DIST;
  
  // Set localDepth to our new max tracing distance:
  globalDepth = MIN_DIST;
  for(int i = 0; i< maxSteps; i++){
    vec4 globalEndPoint = pointOnGeodesic(rO, rD, globalDepth);
    float globalDist = globalSceneSDF(globalEndPoint, invCellBoost, true);
    if(globalDist < EPSILON){
      // hitWhich has been set by globalSceneSDF
      sampleEndPoint = globalEndPoint;
      sampleTangentVector = tangentVectorOnGeodesic(rO, rD, globalDepth);
      return;
    }
    globalDepth += globalDist;
  }

  return;
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
  raymarch(rayOrigin, rayDirVPrime);

  //Based on hitWhich decide whether we hit a global object, local object, or nothing
  if(hitWhich == 0){ //Didn't hit anything ------------------------
    out_FragColor = vec4(0.0);
    return;
  }
  else if(hitWhich == 1){ // global lights
    out_FragColor = vec4(globalLightColor.rgb, 1.0);
    return;
  }
  else{ // objects
    N = estimateNormal(sampleEndPoint);
    vec3 color;
    color = phongModel(inverse(globalObjectBoost));
    out_FragColor = vec4(color, 1.0);
  }
}