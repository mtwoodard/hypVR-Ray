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

// Get point at distance dist on the geodesic from u in the direction vPrime
vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist){ 
  // Calculate the point so that the angle between the resulting vectors will be dist.
  // NOTE: vPrime will be normalized.
  float mag = atan(dist);
  return geometryNormalize(u + vPrime*mag, true);
}

vec4 tangentVectorOnGeodesic(vec4 u, vec4 vPrime, float dist){
  vec4 v = pointOnGeodesic( u, vPrime, dist );
  vec4 tangent = v*(1.0+cos(dist)) - u;
  return geometryNormalize(tangent, true);
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