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
  return cos(geometryDot(u,v));
}
vec4 geometryDirection(vec4 u, vec4 v){
  vec4 w = v + geometryDot(u,v)*u;
  return geometryNormalize(w, true);
}

//-------------------------------------------------------
//
//-------------------------------------------------------

// Same formula as in the hyperbolic case gives us gnomonic model
vec4 projectToKlein(vec4 v){
  return v/v.w;
}

// Get point at distance dist on the geodesic from u through v
vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist){ 
  return u*cos(dist) + vPrime*sin(dist);
}

vec4 tangentVectorOnGeodesic(vec4 u, vec4 vPrime, float dist){
  return u*sin(dist) + vPrime*cos(dist);
}

vec4 pointOnGeodesicAtInfinity(vec4 u, vec4 vPrime){ // returns point on the light
  // cone intersect Klein model corresponding to the point at infinity on the
  // geodesic through u and v
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