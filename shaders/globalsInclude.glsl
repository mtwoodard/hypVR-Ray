//--------------------------------------------
//Global Constants
//--------------------------------------------
const int MAX_MARCHING_STEPS = 127;
const float MIN_DIST = 0.0;
const float EPSILON = 0.0001;
const vec4 ORIGIN = vec4(0,0,0,1);
//--------------------------------------------
//Global Variables
//--------------------------------------------
vec4 sampleEndPoint = vec4(1, 1, 1, 1);
vec4 sampleTangentVector = vec4(1, 1, 1, 1);
mat4 totalFixMatrix = mat4(1.0);
vec4 N = ORIGIN; //normal vector
vec4 globalLightColor = ORIGIN;
int hitWhich = 0;
//-------------------------------------------
//Translation & Utility Variables
//--------------------------------------------
uniform int isStereo;
//uniform int geometry;
uniform vec2 screenResolution;
uniform float fov;
uniform mat4 invGenerators[6];
uniform mat4 currentBoost;
uniform mat4 leftCurrentBoost;
uniform mat4 rightCurrentBoost;
uniform mat4 cellBoost; 
uniform mat4 invCellBoost;
uniform int maxSteps;
uniform float maxDist;
//--------------------------------------------
//Lighting Variables & Global Object Variables
//--------------------------------------------
uniform vec4 lightPositions[4];
uniform vec4 lightIntensities[6]; //w component is the light's attenuation -- 6 since we need controllers
uniform int attnModel;
uniform sampler2D texture;
uniform int controllerCount; //Max is two
uniform mat4 controllerBoosts[2];
//uniform vec4 controllerDualPoints[6];
uniform mat4 globalObjectBoosts[4];
uniform mat4 invGlobalObjectBoosts[4]; 
uniform vec3 globalObjectRadii[4];
uniform int globalObjectTypes[4];
//--------------------------------------------
//Scene Dependent Variables
//--------------------------------------------
uniform vec4 halfCubeDualPoints[3];
uniform float halfCubeWidthKlein;
uniform float sphereRad;
uniform float tubeRad;
uniform vec4 vertexPosition;
uniform float vertexSurfaceOffset;

// These are the planar mirrors of the fundamental simplex in the Klein (or analagous) model.
// Order is mirrors opposite: vertex, edge, face, cell.
// The xyz components of a vector give the unit normal of the mirror. The sense will be that the normal points outside of the simplex.
// The w component is the offset from the origin.
uniform vec4 simplexMirrorsKlein[4];

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
float cosh(float x){
  float eX = exp(x);
  return (0.5 * (eX + 1.0/eX));
}

float acosh(float x){ //must be more than 1
  return log(x + sqrt(x*x-1.0));
}

//--------------------------------------------------------------------
// Generalized Functions
//--------------------------------------------------------------------

vec4 geometryNormalize(vec4 v, bool toTangent);
vec4 geometryDirection(vec4 u, vec4 v);
vec4 geometryFixDirection(vec4 u, vec4 v, mat4 fixMatrix);
float geometryDot(vec4 u, vec4 v);
float geometryDistance(vec4 u, vec4 v);
float geometryNorm(vec4 v){
  return sqrt(abs(geometryDot(v,v)));
}

vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist);
bool isOutsideCell(vec4 samplePoint, out mat4 fixMatrix);

//--------------------------------------------------------------------
// Generalized SDFs
//--------------------------------------------------------------------

float globalSceneSDF(vec4 samplePoint);
float localSceneSDF(vec4 samplePoint);

float sphereSDF(vec4 samplePoint, vec4 center, float radius){
  return geometryDistance(samplePoint, center) - radius;
}

float sortOfEllipsoidSDF(vec4 samplePoint, mat4 boostMatrix){
  return sphereSDF(geometryNormalize(samplePoint * boostMatrix, false), ORIGIN, 0.05);
}

float controllerSDF(vec4 samplePoint, mat4 controllerBoost, float radius){
  float sphere = sphereSDF(samplePoint, ORIGIN * controllerBoost, radius);
  
  //generated on JS side
  //may be subject to change
  //translateByVector(0,0,0.2)*scale matrix (0.8, 0.8, 0.4)
  mat4 scaleMatrix = mat4(
    0.8, 0.0, 0.0, 0.0,
    0.0, 0.8, 0.0, 0.0,
    0.0, 0.0, 0.408, 0.0805,
    0.0, 0.0, 0.2013, 1.02
  );

  //We need to offset this so that the ellipsoid is not centered at the same point as the sphere
  float ellipsoid = sortOfEllipsoidSDF(samplePoint, scaleMatrix * controllerBoost);
  return unionSDF(sphere, ellipsoid);
}

//--------------------------------------------------------------------
// Lighting Functions
//--------------------------------------------------------------------

//Essentially we are starting at our sample point then marching to the light
//If we make it to/past the light without hitting anything we return 1
//otherwise the spot does not receive light from that light source
/*float shadowMarch(vec4 dirToLight, float distToLight){
  int fakeI = 0;
  float value = 0.0;
  mat4 fixMatrix;
  // Depth of our raymarcher 
  float globalDepth = MIN_DIST + 0.1; float localDepth = MIN_DIST + 0.1;
  // Values for local scene 
  vec4 localrO = sampleInfo[2]; vec4 localrD = dirToLight;
  // Are you ready boots? Start marchin'.
  for(int i = 0; i<MAX_MARCHING_STEPS; i++){
    if(fakeI >= maxSteps) break;
    fakeI++;
    vec4 localEndPoint = pointOnGeodesic(localrO, localrD, localDepth);
    vec4 globalEndPoint = pointOnGeodesic(sampleInfo[0], dirToLight, globalDepth);
    if(isOutsideCell(localEndPoint, fixMatrix)){
      localrO = geometryNormalize(localEndPoint*fixMatrix, false);
      localrD = geometryDirection(localrO, localrD*fixMatrix);
      localDepth = MIN_DIST;
    }
    else{
      float localDist = localSceneSDF(localEndPoint);
      float globalDist = globalSceneSDF(globalEndPoint);
      float dist = min(localDist, globalDist);
      if(globalDist < EPSILON)
        return 0.0;
      globalDepth += dist;
      localDepth += dist;
      if(globalDepth >= distToLight)
        return 1.0;
    }
  }
  return 1.0;
}

//Global only shadow march
float shadowMarch(vec4 dirToLight, float distToLight){
  int fakeI = 0;
  mat4 fixMatrix;
  // Depth of our raymarcher 
  float depth = MIN_DIST + 0.1;
  vec4 samplePoint = sampleInfo[0];
  // Are you ready boots? Start marchin'.
  for(int i = 0; i<MAX_MARCHING_STEPS; i++){
    if(fakeI >= maxSteps) break;
    fakeI++;
    vec4 globalSamplePoint = pointOnGeodesic(samplePoint, dirToLight, depth);
    float dist = globalSceneSDF(globalSamplePoint);
    if(dist < EPSILON)
      return 0.0;
    depth += dist;
    if(depth >= distToLight)
      return 1.0;
  }
  return 1.0;
}*/

vec4 texcube(vec4 samplePoint, mat4 toOrigin){
    float k = 4.0;
    vec4 newSP = samplePoint * toOrigin;
    vec3 p = mod(newSP.xyz,1.0);
    vec3 n = geometryNormalize(N*toOrigin, true).xyz; //Very hacky you are warned
    vec3 m = pow(abs(n), vec3(k));
    vec4 x = texture2D(texture, p.yz);
    vec4 y = texture2D(texture, p.zx);
    vec4 z = texture2D(texture, p.xy);
    return (x*m.x + y*m.y + z*m.z) / (m.x+m.y+m.z);
}


float attenuation(float distToLight, vec4 lightIntensity){
  float att;
  if(attnModel == 1) //Inverse Linear
    att  = 0.75/ (0.01+lightIntensity.w * distToLight);  
  else if(attnModel == 2) //Inverse Square
    att  = 1.0/ (0.01+lightIntensity.w * distToLight* distToLight);
  else if(attnModel == 3) // Inverse Cube
    att = 1.0/ (0.01+lightIntensity.w*distToLight*distToLight*distToLight);
  else if(attnModel == 4) //Physical
    att  = 1.0/ (0.01+lightIntensity.w*cosh(2.0*distToLight)-1.0);
  else //None
    att  = 0.25; //if its actually 1 everything gets washed out
  return att;
}

vec3 lightingCalculations(vec4 SP, vec4 TLP, vec4 V, vec3 baseColor, vec4 lightIntensity){
  float distToLight = geometryDistance(SP, TLP);
  float att = attenuation(distToLight, lightIntensity);
  //Calculations - Phong Reflection Model
  float shadow = 1.0;
  vec4 L = geometryDirection(SP, TLP);
  vec4 R = 2.0*geometryDot(L, N)*N - L;
  //Calculate Diffuse Component
  float nDotL = max(geometryDot(N, L),0.0);
  vec3 diffuse = lightIntensity.rgb * nDotL;
  //Check if nDotL = 0  if so don't bother with shadowMarch
  //if(nDotL == 0.0)
  //  shadow = 0.0;
  //shadow = shadowMarch(L, distToLight);
  //Calculate Specular Component
  float rDotV = max(geometryDot(R, V),0.0);
  vec3 specular = lightIntensity.rgb * pow(rDotV,10.0);
  //Compute final color
  return att*(shadow*((diffuse*baseColor) + specular));
}

vec3 phongModel(mat4 invObjectBoost, bool isGlobal){
    vec4 V, samplePoint;
    float ambient = 0.1;
    vec3 baseColor = vec3(0.0,1.0,1.0);

    //--------------------------------------------
    //Setup Variables
    //--------------------------------------------    
	samplePoint = sampleEndPoint;
    V = -sampleTangentVector; //Viewer is in the direction of the negative ray tangent vector
    if(isGlobal){ //this may be possible to move outside function as we already have an if statement for global v. local
      totalFixMatrix = mat4(1.0);
      baseColor = texcube(samplePoint, cellBoost * invObjectBoost).xyz; 
    }
    else{
      baseColor = texcube(samplePoint, mat4(1.0)).xyz;
    }

    //Setup up color with ambient component
    vec3 color = baseColor * ambient; 

    //--------------------------------------------
    //Lighting Calculations
    //--------------------------------------------
    vec4 translatedLightPosition;
    //Standard Light Objects
    for(int i = 0; i<NUM_LIGHTS; i++){
      if(lightIntensities[i].w != 0.0){
        translatedLightPosition = lightPositions[i]*invCellBoost*totalFixMatrix;
        color += lightingCalculations(samplePoint, translatedLightPosition, V, baseColor, lightIntensities[i]);
      }
    }
    //Lights for Controllers
    for(int i = 0; i<2; i++){
      if(controllerCount == 0) break; //if there are no controllers do nothing
      else translatedLightPosition = ORIGIN*controllerBoosts[i]*currentBoost;
      color += lightingCalculations(samplePoint, translatedLightPosition, V, baseColor, lightIntensities[i+4]);
      if(controllerCount == 1) break; //if there is one controller only do one loop
    }
    return color;
}

/*else if(globalObjectTypes[i] == 1){ //cuboid
        vec4 dual0 = geometryDirection(globalObjectBoosts[i][3], globalObjectBoosts[i][3]*translateByVector(vec3(0.1,0.0,0.0)));
        vec4 dual1 = geometryDirection(globalObjectBoosts[i][3], globalObjectBoosts[i][3]*translateByVector(vec3(0.0,0.1,0.0)));
        vec4 dual2 = geometryDirection(globalObjectBoosts[i][3], globalObjectBoosts[i][3]*translateByVector(vec3(0.0,0.0,0.1)));
        objDist = geodesicCubeHSDF(absoluteSamplePoint, dual0, dual1, dual2, globalObjectRadii[i]);
      }*/