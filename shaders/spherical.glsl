//-------------------------------------------------------
// Generalized Functions
//-------------------------------------------------------
float geometryDot(vec4 u, vec4 v){
  return dot(u,v);
}
vec4 geometryNormalize(vec4 u, bool toTangent){
  return normalize(u);
}
float geometryDistance(vec4 u, vec4 v){
  return acos(geometryDot(u,v));
}
vec4 geometryDirection(vec4 u, vec4 v){
  vec4 w = v - geometryDot(u,v)*u;
  return geometryNormalize(w, true);
}
//calculate the new direction vector (v) for the continuation of the ray from the new ray origin (u)
//having moved by fix matrix
vec4 geometryFixDirection(vec4 u, vec4 v, mat4 fixMatrix){
  return geometryDirection(u, v*fixMatrix);
}

//-------------------------------------------------------
//
//-------------------------------------------------------

// Same formula as in the hyperbolic case gives us gnomonic model
vec4 projectToKlein(vec4 v){
  return v/v.w;
}

// Get point at distance dist on the geodesic from u in the direction vPrime
vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist){ 
  return u*cos(dist) + vPrime*sin(dist);
}

vec4 tangentVectorOnGeodesic(vec4 u, vec4 vPrime, float dist){
  return -u*sin(dist) + vPrime*cos(dist);
}

vec4 pointOnGeodesicAtInfinity(vec4 u, vec4 vPrime){ 
  // I'm not yet sure what we should be doing here.
  return projectToKlein(u + vPrime);
}

//---------------------------------------------------------------------
//Raymarch Primitives
//---------------------------------------------------------------------
float geodesicPlaneHSDF(vec4 samplePoint, vec4 dualPoint, float offset){
  return sphereSDF(samplePoint, dualPoint, offset);
}

float horosphereHSDF(vec4 samplePoint, vec4 lightPoint, float offset){
  return 0.0;
}

float geodesicCylinderHSDFplanes(vec4 samplePoint, vec4 dualPoint1, vec4 dualPoint2, float radius){
  return 0.0;
}