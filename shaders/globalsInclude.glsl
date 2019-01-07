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
uniform mat4 stereoBoosts[2];
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
uniform bool renderShadows[2];
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
uniform float tubeRad;
uniform vec4 cellPosition;
uniform float cellSurfaceOffset;
uniform vec4 vertexPosition;
uniform float vertexSurfaceOffset;

// These are the planar mirrors of the fundamental simplex in the Klein (or analagous) model.
// Order is mirrors opposite: vertex, edge, face, cell.
// The xyz components of a vector give the unit normal of the mirror. The sense will be that the normal points to the outside of the simplex.
// The w component is the offset from the origin.
uniform bool useSimplex;
uniform vec4 simplexMirrorsKlein[4];
uniform vec4 simplexDualPoints[4];

// The type of cut (1=sphere, 2=horosphere, 3=plane) for the vertex opposite the fundamental simplex's 4th mirror.
// These integers match our values for the geometry of the honeycomb vertex figure.
// We'll need more of these later when we support more symmetry groups.
uniform int cut1;
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

float globalSceneSDF(vec4 samplePoint, mat4 globalTransMatrix, bool collideWithLights);
float localSceneSDF(vec4 samplePoint);

float sphereSDF(vec4 samplePoint, vec4 center, float radius){
  return geometryDistance(samplePoint, center) - radius;
}

float sortOfEllipsoidSDF(vec4 samplePoint, mat4 boostMatrix, mat4 globalTransMatrix){
  //return sphereSDF(geometryNormalize(samplePoint * boostMatrix, false), ORIGIN * globalTransMatrix, 0.05);
  return sphereSDF(samplePoint, boostMatrix[3] * globalTransMatrix, 0.05);
}

float controllerSDF(vec4 samplePoint, mat4 controllerBoost, float radius, mat4 globalTransMatrix){
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
  float ellipsoid = sortOfEllipsoidSDF(samplePoint, scaleMatrix * controllerBoost, globalTransMatrix);
  return unionSDF(sphere, ellipsoid);
}

//--------------------------------------------------------------------
// Lighting Functions
//--------------------------------------------------------------------

//Essentially we are starting at our sample point then marching to the light
//If we make it to/past the light without hitting anything we return 1
//otherwise the spot does not receive light from that light source
float shadowMarch(vec4 origin, vec4 dirToLight, float distToLight, mat4 globalTransMatrix){
    if(renderShadows[1]){
      float globalDepth = EPSILON * 100.0;
      for(int i = 0; i< MAX_MARCHING_STEPS; i++){
        vec4 globalEndPoint = pointOnGeodesic(origin, dirToLight, globalDepth);
        float globalDist = globalSceneSDF(globalEndPoint, globalTransMatrix, false);
        if(globalDist < EPSILON){
          return 0.0;
        }
        globalDepth += globalDist;
        if(globalDepth > distToLight){
          return 1.0;
        }
      }
      return 1.0;
    }
    return 1.0;
}

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

vec3 lightingCalculations(vec4 SP, vec4 TLP, vec4 V, vec3 baseColor, vec4 lightIntensity, mat4 globalTransMatrix){
  float distToLight = geometryDistance(SP, TLP);
  float att = attenuation(distToLight, lightIntensity);
  //Calculations - Phong Reflection Model
  vec4 L = geometryDirection(SP, TLP);
  vec4 R = 2.0*geometryDot(L, N)*N - L;
  //Calculate Diffuse Component
  float nDotL = max(geometryDot(N, L),0.0);
  vec3 diffuse = lightIntensity.rgb * nDotL;
  //Calculate Shadows
  float shadow = 1.0;
  shadow = shadowMarch(SP, L, distToLight, globalTransMatrix);
  //Calculate Specular Component
  float rDotV = max(geometryDot(R, V),0.0);
  vec3 specular = lightIntensity.rgb * pow(rDotV,10.0);
  //Compute final color
  return att*(shadow*((diffuse*baseColor) + specular));
}

vec3 phongModel(mat4 invObjectBoost, bool isGlobal, mat4 globalTransMatrix){
  //--------------------------------------------
  //Setup Variables
  //--------------------------------------------
  float ambient = 0.1;
  vec3 baseColor = vec3(0.0,1.0,1.0);
	vec4 SP = sampleEndPoint;
  vec4 TLP;
  vec4 V = -sampleTangentVector;

  if(isGlobal){ //this may be possible to move outside function as we already have an if statement for global v. local
    baseColor = texcube(SP, cellBoost * invObjectBoost).xyz; 
  }
  else{
    baseColor = texcube(SP, mat4(1.0)).xyz;
  }

  //Setup up color with ambient component
  vec3 color = baseColor * ambient; 

  //--------------------------------------------
  //Lighting Calculations
  //--------------------------------------------
  //Standard Light Objects
  for(int i = 0; i<NUM_LIGHTS; i++){
    if(lightIntensities[i].w != 0.0){
      TLP = lightPositions[i]*globalTransMatrix;
      color += lightingCalculations(SP, TLP, V, baseColor, lightIntensities[i], globalTransMatrix);
    }
  }

  //Lights for Controllers
  for(int i = 0; i<2; i++){
    if(controllerCount == 0) break; //if there are no controllers do nothing
    else TLP = ORIGIN*controllerBoosts[i]*currentBoost*cellBoost*globalTransMatrix;

    color += lightingCalculations(SP, TLP, V, baseColor, lightIntensities[i+4], globalTransMatrix);

    if(controllerCount == 1) break; //if there is one controller only do one loop
  }

  return color;
}