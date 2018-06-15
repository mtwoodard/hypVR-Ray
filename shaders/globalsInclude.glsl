//--------------------------------------------
//Global Constants
//--------------------------------------------
const int MAX_MARCHING_STEPS = 127;
const float MIN_DIST = 0.0;
const float MAX_DIST = 100.0;
const float EPSILON = 0.0001;
const vec4 ORIGIN = vec4(0,0,0,1);
//--------------------------------------------
//Generated Constants
//--------------------------------------------
const float halfIdealCubeWidthKlein = 0.5773502692;
const vec4 idealCubeCornerKlein = vec4(halfIdealCubeWidthKlein, halfIdealCubeWidthKlein, halfIdealCubeWidthKlein, 1.0);
//--------------------------------------------
//Global Constants
//--------------------------------------------
uniform int isStereo;
uniform int geometry;
uniform vec2 screenResolution;
uniform float fov;
uniform mat4 invGenerators[6];
uniform mat4 currentBoost;
uniform mat4 leftCurrentBoost;
uniform mat4 rightCurrentBoost;
uniform vec4 leftEyeRotation; //May be removed in the near future
uniform vec4 rightEyeRotation; //May be removed in the near future
uniform mat4 cellBoost; 
uniform mat4 invCellBoost;
uniform int maxSteps;
//--------------------------------------------
//Lighting Variables & Global Object Variables
//--------------------------------------------
uniform vec4 lightPositions[8];
uniform vec4 lightIntensities[8]; //w component is the light's attenuation
uniform int attnModel;
uniform sampler2D texture;
uniform mat4 globalObjectBoosts[8];
uniform mat4 invGlobalObjectBoosts[8];
uniform vec3 globalObjectRadii[8];
uniform int globalObjectTypes[8];
//--------------------------------------------
//Scene Dependent Variables
//--------------------------------------------
uniform vec4 halfCubeDualPoints[3];
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

//--------------------------------------------------------------------
// Hyperbolic Functions
//--------------------------------------------------------------------
float acosh(float x){ //must be more than 1
  return log(x + sqrt(x*x-1.0));
}

float lorentzDot(vec4 u, vec4 v){
  return  u.x*v.x + u.y*v.y + u.z*v.z - u.w*v.w;
} // on hyperbolold if lorentzDot(u,u) = 1, so w*w = 1 + x*x + y*y + z*z

float hypNorm(vec4 v){
  return sqrt(abs(lorentzDot(v,v)));
}

//--------------------------------------------------------------------
// Generalized Functions
//--------------------------------------------------------------------
vec4 geometryNormalize(vec4 u){
  //Euclidean
  if(geometry == 2){
    u.w = 1.0;
    return u;
  }
  //Hyperbolic
  else{
    return u/hypNorm(u);
  }
}

vec4 geometryDirection(vec4 u, vec4 v){
  //Euclidean
  if(geometry == 2){
    vec4 w = v-u;
    w.xyz = normalize(w.xyz);
    return geometryNormalize(w);
  }
  //Hyperbolic
  else{
    vec4 w = v + lorentzDot(u, v)*u;
    return geometryNormalize(w);
  }
}

float geometryDot(vec4 u, vec4 v){
  //Euclidean
  if(geometry == 2){
    return dot(u.xyz, v.xyz);
  }
  //Hyperbolic
  else{
    return lorentzDot(u,v);
  }
}

float geometryDistance(vec4 u, vec4 v){
  //Euclidean
  if(geometry == 2){
    return distance(u.xyz, v.xyz);
  }
  //Hyperbolic
  else{
    float bUV = -lorentzDot(u,v);
    return acosh(bUV);
  }
}

vec4 texcube(sampler2D tex, vec4 samplePoint, vec4 N, float k, mat4 toOrigin){
  //Euclidean
  if(geometry == 2){
    vec3 m = pow(abs(N.xyz), vec3(k));
    vec4 x = texture2D(tex, samplePoint.yz);
    vec4 y = texture2D(tex, samplePoint.zx);
    vec4 z = texture2D(tex, samplePoint.xy);
    return (x*m.x + y*m.y + z*m.z) / (m.x+m.y+m.z);
  }
  //Hyperbolic
  else{
    vec4 newSP = samplePoint * toOrigin;
    vec3 p = mod(newSP.xyz,1.0);
    vec3 n = geometryNormalize(N*toOrigin).xyz; //Very hacky you are warned
    vec3 m = pow(abs(n), vec3(k));
    vec4 x = texture2D(tex, p.yz);
    vec4 y = texture2D(tex, p.zx);
    vec4 z = texture2D(tex, p.xy);
    return (x*m.x + y*m.y + z*m.z) / (m.x+m.y+m.z);
  }
}

/*
vec4 geometryNormalize(vec4 v){
  //Euclidean
  if(geometry == 2){

  }
  //Hyperbolic
  else{
    
  }
}*/