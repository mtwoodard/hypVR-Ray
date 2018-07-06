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
vec4 geometryDirection(vec4 u, vec4 v){
  vec4 w = v-u;
  return geometryNormalize(w, true);
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

float geodesicPlaneHSDF(vec4 samplePoint, vec4 dualPoint, float offset)
{
  return sphereSDF(samplePoint, vec4(0.0), offset);
}

float geodesicCylinderHSDFplanes(vec4 samplePoint, vec4 direction, vec4 cylinderCorePoint, float radius)
{
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