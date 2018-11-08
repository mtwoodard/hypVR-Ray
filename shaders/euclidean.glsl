//-------------------------------------------------------
// Generalized Functions
//-------------------------------------------------------
float geometryDot(vec4 u, vec4 v){
  return dot(u.xyz,v.xyz);
}
vec4 geometryNormalize(vec4 u, bool toTangent){
  if(toTangent){
    u.xyz = normalize(u.xyz);
    u.w = 0.0;
    return u;
  }
  else{
    u.w = 1.0;
    return u;
  }
}

float geometryDistance(vec4 u, vec4 v){
  return distance(u.xyz, v.xyz);
}

//Given two positions find the unit tangent vector at the first that points to the second
vec4 geometryDirection(vec4 u, vec4 v){ 
  vec4 w = v-u;
  return geometryNormalize(w, true);
}

//calculate the new direction vector (v) for the continuation of the ray from the new ray origin (u)
//having moved by fix matrix
vec4 geometryFixDirection(vec4 u, vec4 v, mat4 fixMatrix){
  return v;
}

//-------------------------------------------------------
//
//-------------------------------------------------------

vec4 projectToKlein(vec4 v)
{
  // We are already effectively Klein (i.e. lines are straight in the model)
  v.w = 1.0;
  return v;
}

vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist)
{ 
  // get point at distance dist on the geodesic from u in the direction vPrime
  return projectToKlein( u + vPrime*dist );
}

vec4 tangentVectorOnGeodesic(vec4 u, vec4 vPrime, float dist)
{
  return vPrime;
}

vec4 pointOnGeodesicAtInfinity(vec4 u, vec4 vPrime)
{ 
  // I'm not yet sure what we should be doing here.
  return projectToKlein(u + vPrime);
}

float geodesicCylinderHSDFplanes(vec4 samplePoint, vec4 cylinderCorePoint, vec4 direction, float radius)
{
  cylinderCorePoint = halfCubeDualPoints[0] + halfCubeDualPoints[1];
  direction = halfCubeDualPoints[2];

  vec4 pos = (samplePoint - cylinderCorePoint);
  return length(pos.xyz - geometryDot(pos, direction) * direction.xyz) - radius;
}
//
// Functions below this don't apply, but we need them included to make the shader compile.
//

float horosphereHSDF(vec4 samplePoint, vec4 lightPoint, float offset)
{
  return 0.0;
}

float geodesicPlaneHSDF(vec4 samplePoint, vec4 dualPoint, float offset){
  return 0.0;
}