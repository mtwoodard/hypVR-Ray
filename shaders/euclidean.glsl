mat4 translateByVector(vec3 v) 
{
  float dx = v.x;
  float dy = v.y;
  float dz = v.z;
  return mat4(
    vec4(1.0, 0, 0, dx),
    vec4(0, 1.0, 0, dy),
    vec4(0, 0, 1.0, dz),
    vec4(dx, dy, dz, 1.0) );
}

vec4 lorentzNormalize(vec4 v)
{
  v.w = 1.0;
  return v;
}

float lorentzDot(vec4 u, vec4 v)
{
  return dot(u.xyz,v.xyz);
}

float hypDistance(vec4 u, vec4 v)
{
  return distance( u.xyz, v.xyz );
}

vec4 projectToKlein(vec4 v)
{
  // We are already effectively Klein (i.e. lines are straight in the model)
  v.w = 1.0;
  return v;
}

vec4 directionFrom2Points(vec4 u, vec4 v)
{
  vec4 w = v - u; // feels backwards
  w.xyz = normalize( w.xyz );
  return lorentzNormalize(w);
}

vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist)
{ 
  // get point at distance dist on the geodesic from u through v
  return projectToKlein( u + vPrime*dist );
}

vec4 tangentVectorOnGeodesic(vec4 u, vec4 vPrime, float dist)
{
  // the negative here is to match what we do in hyperbolic.glsl
  return -projectToKlein( u + vPrime*dist );
}

vec4 pointOnGeodesicAtInfinity(vec4 u, vec4 vPrime)
{ 
  // I'm not yet sure what we should be doing here.
  return projectToKlein(u + vPrime);
}

float sphereHSDF(vec4 samplePoint, vec4 center, float radius)
{
  return hypDistance(samplePoint, center) - radius;
}

float geodesicPlaneHSDF(vec4 samplePoint, vec4 dualPoint, float offset)
{
  return sphereHSDF(samplePoint, vec4(0.0), offset);
}

//
// Functions below this don't apply, but we need them included to make the shader compile.
//

float horosphereHSDF(vec4 samplePoint, vec4 lightPoint, float offset)
{
  return 0.0;
}

// Need to remove this, but phong model code in fragment.glsl is using it.
float cosh(float x)
{
  return 0.0;
}